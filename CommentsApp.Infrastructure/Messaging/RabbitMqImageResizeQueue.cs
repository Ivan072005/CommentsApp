using System.Text.Json;
using CommentsApp.Domain.Interfaces;
using RabbitMQ.Client;

namespace CommentsApp.Infrastructure.Messaging;

public sealed class RabbitMqImageResizeQueue : IImageResizeQueue
{
    private readonly RabbitMqConnectionProvider _connectionProvider;

    public RabbitMqImageResizeQueue(RabbitMqConnectionProvider connectionProvider)
    {
        _connectionProvider = connectionProvider;
    }

    public async Task EnqueueAsync(int attachmentId, CancellationToken cancellationToken)
    {
        var connection = await _connectionProvider.GetConnectionAsync(cancellationToken);

        // Канал на одну отправку — просто и безопасно для нашего масштаба.
        await using var channel = await connection.CreateChannelAsync(cancellationToken: cancellationToken);

        // Повторное объявление безопасно: если очередь есть, ничего не изменится.
        await channel.QueueDeclareAsync(
            queue: RabbitMqQueues.ImageResize,
            durable: true,
            exclusive: false,
            autoDelete: false,
            arguments: null,
            cancellationToken: cancellationToken);

        var body = JsonSerializer.SerializeToUtf8Bytes(new ImageResizeMessage(attachmentId));

        var properties = new BasicProperties
        {
            Persistent = true,                 // delivery_mode = 2: переживёт перезапуск RabbitMQ
            ContentType = "application/json"
        };

        await channel.BasicPublishAsync(
            exchange: string.Empty,            // (AMQP default) — кладёт прямо в очередь с именем routingKey
            routingKey: RabbitMqQueues.ImageResize,
            mandatory: false,
            basicProperties: properties,
            body: body,
            cancellationToken: cancellationToken);
    }
}