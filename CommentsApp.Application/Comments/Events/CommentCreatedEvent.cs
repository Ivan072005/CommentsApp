using MediatR;

namespace CommentsApp.Application.Comments.Events;

// Доменное событие "комментарий создан". Публикуется ПОСЛЕ успешного сохранения в БД.
// Создатель события (CreateCommentCommandHandler) не знает, кто на него подписан —
// каждый подписчик (INotificationHandler<CommentCreatedEvent>) делает своё дело:
//   - InvalidateCommentsCacheHandler — сбрасывает кэш первой страницы в Redis;
//   - BroadcastCommentCreatedHandler (Api) — рассылает комментарий всем через SignalR.
public sealed record CommentCreatedEvent(int CommentId, int? ParentId) : INotification;
