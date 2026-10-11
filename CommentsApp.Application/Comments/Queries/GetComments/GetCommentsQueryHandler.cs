using CommentsApp.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CommentsApp.Application.Comments.Queries.GetComments;

public class GetCommentsQueryHandler : IRequestHandler<GetCommentsQuery, List<CommentDto>>
{
    private readonly AppDbContext _db;

    public GetCommentsQueryHandler(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<CommentDto>> Handle(GetCommentsQuery request, CancellationToken cancellationToken)
    {
        // 1. Берём только заглавные комментарии (не ответы)
        var query = _db.Comments
            .Where(c => c.ParentId == null)
            .Include(c => c.User) // подтягиваем данные пользователя вместе с комментарием
            .AsQueryable();

        // 2. Сортировка — выбираем поле по строке из запроса
        query = request.SortBy switch
        {
            "userName" => request.Descending
                ? query.OrderByDescending(c => c.User.UserName)
                : query.OrderBy(c => c.User.UserName),
            "email" => request.Descending
                ? query.OrderByDescending(c => c.User.Email)
                : query.OrderBy(c => c.User.Email),
            _ => request.Descending // по умолчанию — сортировка по дате
                ? query.OrderByDescending(c => c.CreatedAt)
                : query.OrderBy(c => c.CreatedAt)
        };

        // 3. Пагинация — пропускаем предыдущие страницы, берём нужное количество
        var comments = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(CommentProjections.ToDto)
            .ToListAsync(cancellationToken);

        return comments;
    }
}