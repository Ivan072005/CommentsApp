using CommentsApp.Application.Comments.Queries.GetComments;
using HotChocolate;
using HotChocolate.Types;

namespace CommentsApp.Api.GraphQL;

// Добавляем к типу CommentDto новое поле "replies", не трогая сам DTO.
[ExtendObjectType(typeof(CommentDto))]
public class CommentRepliesExtension
{
    public async Task<IReadOnlyList<CommentDto>> GetReplies(
        [Parent] CommentDto comment,
        RepliesByParentIdDataLoader loader,
        CancellationToken cancellationToken)
    {
        // Ответов нет — даже не ставим в очередь DataLoader
        if (comment.RepliesCount == 0)
            return Array.Empty<CommentDto>();

        return await loader.LoadAsync(comment.Id, cancellationToken) ?? Array.Empty<CommentDto>();
    }
}