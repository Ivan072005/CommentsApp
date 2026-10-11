using MediatR;

namespace CommentsApp.Application.Comments.Queries.GetComments;

public record GetCommentsQuery(
    int Page,
    int PageSize,
    string SortBy,      // "userName" | "email" | "date"
    bool Descending
) : IRequest<List<CommentDto>>;