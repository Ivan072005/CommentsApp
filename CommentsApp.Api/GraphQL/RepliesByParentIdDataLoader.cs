using CommentsApp.Application.Comments.Queries.GetComments;
using CommentsApp.Infrastructure.Persistence;
using GreenDonut;
using Microsoft.EntityFrameworkCore;

namespace CommentsApp.Api.GraphQL;

// Собирает id родителей со всего уровня дерева и делает ОДИН SQL-запрос.
// Grouped: на один ключ (id родителя) приходится несколько значений (ответов).
public sealed class RepliesByParentIdDataLoader : GroupedDataLoader<int, CommentDto>
{
    private readonly IServiceScopeFactory _scopeFactory;

    public RepliesByParentIdDataLoader(
        IServiceScopeFactory scopeFactory,
        IBatchScheduler batchScheduler,
        DataLoaderOptions options)
        : base(batchScheduler, options)
    {
        _scopeFactory = scopeFactory;
    }

    protected override async Task<ILookup<int, CommentDto>> LoadGroupedBatchAsync(
        IReadOnlyList<int> keys,
        CancellationToken cancellationToken)
    {
        // Свой DbContext на каждый пакет: GraphQL может выполнять поля параллельно,
        // а один DbContext нельзя использовать из двух мест одновременно.
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var parentIds = keys.ToArray();

        var replies = await db.Comments
            .Where(c => c.ParentId != null && parentIds.Contains(c.ParentId.Value))
            .OrderBy(c => c.CreatedAt) // ответы — от старых к новым
            .Select(CommentProjections.ToDto)
            .ToListAsync(cancellationToken);

        return replies.ToLookup(r => r.ParentId!.Value);
    }
}