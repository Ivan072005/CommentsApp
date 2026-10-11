namespace CommentsApp.Domain.Interfaces;

public interface IFileStorageService
{
    Task<FileUploadResult> SaveImageAsync(Stream fileStream, string fileName, CancellationToken cancellationToken);
    Task<FileUploadResult> SaveTextFileAsync(Stream fileStream, string fileName, long sizeBytes, CancellationToken cancellationToken);
    Task<long> ResizeImageAsync(string storedPath, CancellationToken cancellationToken);
}

public record FileUploadResult(bool IsValid, string? StoredPath, string? ContentType, long SizeBytes, string? ErrorMessage);
