namespace CommentsApp.Domain.Interfaces;

public interface ICaptchaService
{
    Task<CaptchaChallenge> GenerateAsync(CancellationToken cancellationToken = default);
    Task<bool> ValidateAsync(string id, string code, CancellationToken cancellationToken = default);
}

public record CaptchaChallenge(string Id, string ImageDataUri);