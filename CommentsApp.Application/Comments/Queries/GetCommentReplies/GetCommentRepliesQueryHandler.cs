using CommentsApp.Application.Comments.Queries.GetComments;
using CommentsApp.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CommentsApp.Application.Comments.Queries.GetCommentReplies;

public class GetCommentRepliesQueryHandler : IRequestHandler<GetCommentRepliesQuery, List<CommentDto>>
{
    private readonly AppDbContext _db;

    public GetCommentRepliesQueryHandler(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<CommentDto>> Handle(GetCommentRepliesQuery request, CancellationToken cancellationToken)
    {
        var replies = await _db.Comments
            .Where(c => c.ParentId == request.ParentId)
            .Include(c => c.User)
            .OrderBy(c => c.CreatedAt) // ответы обычно показывают в хронологическом порядке, старые сверху
            .Select(CommentProjections.ToDto)
            .ToListAsync(cancellationToken);

        return replies;
    }
}