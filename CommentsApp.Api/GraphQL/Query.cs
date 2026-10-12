using CommentsApp.Application.Comments.Queries.GetCommentReplies;
using CommentsApp.Application.Comments.Queries.GetComments;
using HotChocolate;
using MediatR;

namespace CommentsApp.Api.GraphQL;

// "Меню" GraphQL: каждый публичный метод = поле, которое клиент может запросить.
// Префикс Get отбрасывается: GetComments -> поле "comments".
public class Query
{
    // Заглавные комментарии — та же логика (сортировка, 25 на страницу), что и REST GET /api/Comments
    public Task<List<CommentDto>> GetComments(
        [Service] IMediator mediator,
        int page = 1,
        int pageSize = 25,
        string sortBy = "date",
        bool descending = true,
        CancellationToken cancellationToken = default)
        => mediator.Send(new GetCommentsQuery(page, pageSize, sortBy, descending), cancellationToken);

    // Прямые ответы на комментарий — фронт раскрывает дерево по одному уровню
    public Task<List<CommentDto>> GetReplies(
        [Service] IMediator mediator,
        int parentId,
        CancellationToken cancellationToken = default)
        => mediator.Send(new GetCommentRepliesQuery(parentId), cancellationToken);
}