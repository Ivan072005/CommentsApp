namespace CommentsApp.Domain.Interfaces;

public interface ICommentSanitizer
{
    SanitizeResult Sanitize(string rawText);
}

public record SanitizeResult(bool IsValid, string? SanitizedText, string? ErrorMessage);