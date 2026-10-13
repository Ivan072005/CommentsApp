using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using CommentsApp.Domain.Interfaces;

namespace CommentsApp.Infrastructure.Services;

public class CommentSanitizer : ICommentSanitizer
{
    // Разрешённые теги и их допустимые атрибуты
    private static readonly Dictionary<string, string[]> AllowedTags = new()
    {
        { "a", new[] { "href", "title" } },
        { "code", Array.Empty<string>() },
        { "i", Array.Empty<string>() },
        { "strong", Array.Empty<string>() }
    };

    // Находит все HTML-теги в тексте: открывающие, закрывающие, самозакрывающиеся
    private static readonly Regex TagRegex = new(
        @"<\/?([a-zA-Z0-9]+)((?:\s+[a-zA-Z0-9-]+(?:\s*=\s*(?:""[^""]*""|'[^']*'))?)*)\s*\/?>",
        RegexOptions.Compiled);

    public SanitizeResult Sanitize(string rawText)
    {
        if (string.IsNullOrWhiteSpace(rawText))
            return new SanitizeResult(false, null, "Текст не может быть пустым");

        // 1. Проверяем баланс тегов (открытие/закрытие)
        var balanceCheck = CheckTagsBalance(rawText);
        if (!balanceCheck.IsValid)
            return new SanitizeResult(false, null, balanceCheck.ErrorMessage);

        // 2. Экранируем весь текст, затем возвращаем разрешённые теги обратно
        var sanitized = SanitizeAllowedTags(rawText);

        return new SanitizeResult(true, sanitized, null);
    }

    private (bool IsValid, string? ErrorMessage) CheckTagsBalance(string text)
    {
        var stack = new Stack<string>();
        var matches = TagRegex.Matches(text);

        foreach (Match match in matches)
        {
            var tagName = match.Groups[1].Value.ToLowerInvariant();
            var fullTag = match.Value;

            if (!AllowedTags.ContainsKey(tagName))
                continue; // неразрешённые теги будут просто экранированы, их баланс не проверяем

            bool isClosing = fullTag.StartsWith("</");
            bool isSelfClosing = fullTag.EndsWith("/>");

            if (isSelfClosing)
                continue;

            if (isClosing)
            {
                if (stack.Count == 0 || stack.Peek() != tagName)
                    return (false, $"Тег <{tagName}> закрыт некорректно или без открытия");
                stack.Pop();
            }
            else
            {
                stack.Push(tagName);
            }
        }

        if (stack.Count > 0)
            return (false, $"Не закрыт тег: <{stack.Peek()}>");

        return (true, null);
    }

    private string SanitizeAllowedTags(string text)
    {
        // Идём по тексту: обычный текст МЕЖДУ тегами всегда экранируем,
        // а каждый найденный тег обрабатываем отдельно (разрешённый — пересобираем, остальные — экранируем).
        // Раньше текст вне найденных тегов оставался как есть, и, например,
        // <img src=x onerror=alert(1)> (без кавычек — регэксп его не находит) попадал в HTML без изменений.
        var result = new StringBuilder(text.Length);
        var lastIndex = 0;

        foreach (Match match in TagRegex.Matches(text))
        {
            result.Append(WebUtility.HtmlEncode(text[lastIndex..match.Index]));
            result.Append(ProcessTag(match));
            lastIndex = match.Index + match.Length;
        }

        result.Append(WebUtility.HtmlEncode(text[lastIndex..]));
        return result.ToString();
    }

    private string ProcessTag(Match match)
    {
        var tagName = match.Groups[1].Value.ToLowerInvariant();
        var attributesRaw = match.Groups[2].Value;
        var fullTag = match.Value;
        bool isClosing = fullTag.StartsWith("</");

        if (!AllowedTags.ContainsKey(tagName))
        {
            // неразрешённый тег — экранируем целиком, чтобы не выполнился как HTML
            return WebUtility.HtmlEncode(fullTag);
        }

        if (isClosing)
            return $"</{tagName}>";

        // разрешённый тег — оставляем только разрешённые атрибуты, безопасно обработав значения
        var allowedAttrs = AllowedTags[tagName];
        var cleanAttrs = ExtractSafeAttributes(attributesRaw, allowedAttrs);

        return cleanAttrs.Length > 0
            ? $"<{tagName} {cleanAttrs}>"
            : $"<{tagName}>";
    }

    private string ExtractSafeAttributes(string attributesRaw, string[] allowedAttrs)
    {
        if (allowedAttrs.Length == 0)
            return string.Empty;

        var attrRegex = new Regex(@"([a-zA-Z0-9-]+)\s*=\s*""([^""]*)""");
        var result = new List<string>();

        foreach (Match attrMatch in attrRegex.Matches(attributesRaw))
        {
            var attrName = attrMatch.Groups[1].Value.ToLowerInvariant();
            var attrValue = attrMatch.Groups[2].Value;

            if (!allowedAttrs.Contains(attrName))
                continue;

            // для href разрешаем только http/https, блокируем javascript: и подобные схемы
            if (attrName == "href" && !IsSafeUrl(attrValue))
                continue;

            var safeValue = WebUtility.HtmlEncode(attrValue);
            result.Add($"{attrName}=\"{safeValue}\"");
        }

        return string.Join(" ", result);
    }

    private bool IsSafeUrl(string url)
    {
        if (Uri.TryCreate(url, UriKind.Absolute, out var uri))
            return uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps;

        return false;
    }
}