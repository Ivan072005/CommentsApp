using CommentsApp.Api.Hubs;
using CommentsApp.Application.Comments.Events;
using CommentsApp.Application.Comments.Queries.GetComments;
using CommentsApp.Infrastructure.Persistence;
using MediatR;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace CommentsApp.Api.Realtime;

// Подписчик события CommentCreatedEvent: достаёт свежий комментарий из БД
// и рассылает его всем подключённым браузерам через SignalR.
public sealed class BroadcastCommentCreatedHandler : INotificationHandler<CommentCreatedEvent>
{
    private readonly IHubContext<CommentsHub> _hub;
    private readonly AppDbContext _db;
    private readonly ILogger<BroadcastCommentCreatedHandler> _logger;

    public BroadcastCommentCreatedHandler(
        IHubContext<CommentsHub> hub,
        AppDbContext db,
        ILogger<BroadcastCommentCreatedHandler> logger)
    {
        _hub = hub;
        _db = db;
        _logger = logger;
    }

    public async Task Handle(CommentCreatedEvent notification, CancellationToken cancellationToken)
    {
        try
        {
            // Тот же формат, что отдают REST и GraphQL — фронт обработает его одинаково
            var comment = await _db.Comments
                .AsNoTracking()
                .Where(c => c.Id == notification.CommentId)
                .Select(CommentProjections.ToDto)
                .FirstOrDefaultAsync(cancellationToken);

            if (comment is null)
                return;

            await _hub.Clients.All.SendAsync(CommentsHub.CommentCreatedMethod, comment, cancellationToken);
            _logger.LogInformation("SignalR: разослан новый комментарий {Id}", comment.Id);
        }
        catch (Exception ex)
        {
            // Комментарий уже сохранён — ошибка рассылки не должна превращать ответ автору в 500
            _logger.LogWarning(ex, "SignalR: не удалось разослать комментарий {Id}", notification.CommentId);
        }
    }
}
