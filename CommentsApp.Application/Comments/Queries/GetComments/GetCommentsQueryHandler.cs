using System.Text.Json;
using CommentsApp.Application.Comments.Caching;
using CommentsApp.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;

namespace CommentsApp.Application.Comments.Queries.GetComments;

public class GetCommentsQueryHandler : IRequestHandler<GetCommentsQuery, List<CommentDto>>
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly AppDbContext _db;
    private readonly IDistributedCache _cache;
    private readonly ILogger<GetCommentsQueryHandler> _logger;

    public GetCommentsQueryHandler(AppDbContext db, IDistributedCache cache, ILogger<GetCommentsQueryHandler> logger)
    {
        _db = db;
        _cache = cache;
        _logger = logger;
    }

    public async Task<List<CommentDto>> Handle(GetCommentsQuery request, CancellationToken cancellationToken)
    {
        // 0. Первая страница "по умолчанию" — берём из Redis, если она там есть
        var cacheable = request is { Page: 1, PageSize: 25, SortBy: "date", Descending: true };
        if (cacheable)
        {
            var cached = await TryReadCacheAsync(cancellationToken);
            if (cached is not null)
                return cached;
        }

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

        // 4. Кладём первую страницу в Redis (сбросится при новом комментарии — см. CommentCreatedEvent)
        if (cacheable)
            await TryWriteCacheAsync(comments, cancellationToken);

        return comments;
    }

    // Ошибки Redis не должны ломать список: при сбое просто идём в БД
    private async Task<List<CommentDto>?> TryReadCacheAsync(CancellationToken cancellationToken)
    {
        try
        {
            var json = await _cache.GetStringAsync(CommentsCache.FirstPageKey, cancellationToken);
            if (json is null)
                return null;

            _logger.LogInformation("Первая страница комментариев взята из кэша");
            return JsonSerializer.Deserialize<List<CommentDto>>(json, JsonOptions);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw; // браузер сам отменил запрос (обновили страницу) — это не ошибка Redis
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Не удалось прочитать кэш комментариев");
            return null;
        }
    }

    private async Task TryWriteCacheAsync(List<CommentDto> comments, CancellationToken cancellationToken)
    {
        try
        {
            var json = JsonSerializer.Serialize(comments, JsonOptions);
            await _cache.SetStringAsync(
                CommentsCache.FirstPageKey,
                json,
                new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = CommentsCache.Ttl },
                cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw; // браузер сам отменил запрос — это не ошибка Redis
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Не удалось записать кэш комментариев");
        }
    }
}
