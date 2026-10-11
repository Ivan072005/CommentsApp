using MediatR;
using CommentsApp.Application.Comments.Queries.GetComments;

namespace CommentsApp.Application.Comments.Queries.GetCommentReplies;

public record GetCommentRepliesQuery(int ParentId) : IRequest<List<CommentDto>>;