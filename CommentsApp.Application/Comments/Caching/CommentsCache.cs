namespace CommentsApp.Application.Comments.Caching;

// Кэшируем только самую "горячую" выборку — то, что видит каждый посетитель при входе:
// первая страница, 25 штук, сортировка по дате, новые сверху.
public static class CommentsCache
{
    public const string FirstPageKey = "comments:top:page1";

    // Страховка: даже если сброс кэша не сработал, данные устареют максимум на минуту
    public static readonly TimeSpan Ttl = TimeSpan.FromMinutes(1);
}
