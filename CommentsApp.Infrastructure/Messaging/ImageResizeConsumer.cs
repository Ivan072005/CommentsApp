using System.Text.Json;
using CommentsApp.Domain.Interfaces;
using CommentsApp.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace CommentsApp.Infrastructure.Messaging;

// "Посудомойщик": работает в фоне всё время, пока запущен API, и снимает записки с ленты.
public sealed class ImageResizeConsumer : BackgroundService
{
    private readonly RabbitMqConnectionProvider _connectionProvider;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ImageResizeConsumer> _logger;
    private IChannel? _channel;

    public ImageResizeConsumer(
        RabbitMqConnectionProvider connectionProvider,
        IServiceScopeFactory scopeFactory,
        ILogger<ImageResizeConsumer> logger)
    {
        _connectionProvider = connectionProvider;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            var connection = await _connectionProvider.GetConnectionAsync(stoppingToken);
            _channel = await connection.CreateChannelAsync(cancellationToken: stoppingToken);

            await _channel.QueueDeclareAsync(
                queue: RabbitMqQueues.ImageResize,
                durable: true,
                exclusive: false,
                autoDelete: false,
                arguments: null,
                cancellationToken: stoppingToken);

            // Брать по одной записке за раз.
            await _channel.BasicQosAsync(prefetchSize: 0, prefetchCount: 1, global: false,
                cancellationToken: stoppingToken);

            var consumer = new AsyncEventingBasicConsumer(_channel);
            consumer.ReceivedAsync += async (_, ea) =>
            {
                try
                {
                    var message = JsonSerializer.Deserialize<ImageResizeMessage>(ea.Body.Span)
                                  ?? throw new InvalidOperationException("Пустое сообщение");

                    await ProcessAsync(message.AttachmentId, stoppingToken);

                    // "Сделал, удаляй записку".
                    await _channel.BasicAckAsync(ea.DeliveryTag, multiple: false);
                }
                catch (Exception ex)
                {
                    // Битое сообщение не возвращаем в очередь (requeue: false),
                    // иначе оно будет падать по кругу бесконечно.
                    _logger.LogError(ex, "RabbitMQ: не удалось обработать сообщение из {Queue}",
                        RabbitMqQueues.ImageResize);
                    await _channel.BasicNackAsync(ea.DeliveryTag, multiple: false, requeue: false);
                }
            };

            await _channel.BasicConsumeAsync(
                queue: RabbitMqQueues.ImageResize,
                autoAck: false,
                consumer: consumer,
                cancellationToken: stoppingToken);

            _logger.LogInformation("RabbitMQ: consumer слушает очередь {Queue}", RabbitMqQueues.ImageResize);

            await Task.Delay(Timeout.Infinite, stoppingToken);
        }
        catch (OperationCanceledException)
        {
            // Нормальная остановка API.
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "RabbitMQ: consumer не запустился");
        }
    }

    private async Task ProcessAsync(int attachmentId, CancellationToken cancellationToken)
    {
        // Consumer живёт всё время (singleton), а DbContext — на один "заказ" (scoped).
        // Поэтому на каждое сообщение открываем свою "смену" (scope).
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var fileStorage = scope.ServiceProvider.GetRequiredService<IFileStorageService>();

        var attachment = await db.Attachments.FindAsync(new object[] { attachmentId }, cancellationToken);
        if (attachment is null)
        {
            _logger.LogWarning("RabbitMQ: attachment {Id} не найден", attachmentId);
            return;
        }

        var newSize = await fileStorage.ResizeImageAsync(attachment.StoredPath, cancellationToken);
        attachment.SizeBytes = (int)newSize;
        await db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("RabbitMQ: attachment {Id} уменьшен, новый размер {Size} байт",
            attachmentId, newSize);
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        if (_channel is not null)
            await _channel.CloseAsync(cancellationToken);

        await base.StopAsync(cancellationToken);
    }
}