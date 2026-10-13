using CommentsApp.Application.Comments.Caching;
using MediatR;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;

namespace CommentsApp.Application.Comments.Events;

// Новый комментарий или ответ -> первая страница в кэше устарела
// (новая строка сверху или изменился счётчик ответов). Просто удаляем её из Redis.
public sealed class InvalidateCommentsCacheHandler : INotificationHandler<CommentCreatedEvent>
{
    private readonly IDistributedCache _cache;
    private readonly ILogger<InvalidateCommentsCacheHandler> _logger;

    public InvalidateCommentsCacheHandler(IDistributedCache cache, ILogger<InvalidateCommentsCacheHandler> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    public async Task Handle(CommentCreatedEvent notification, CancellationToken cancellationToken)
    {
        try
        {
            await _cache.RemoveAsync(CommentsCache.FirstPageKey, cancellationToken);
            _logger.LogInformation("Кэш первой страницы сброшен (комментарий {Id})", notification.CommentId);
        }
        catch (Exception ex)
        {
            // Redis недоступен — не страшно: кэш сам устареет через Ttl
            _logger.LogWarning(ex, "Не удалось сбросить кэш комментариев");
        }
    }
}
