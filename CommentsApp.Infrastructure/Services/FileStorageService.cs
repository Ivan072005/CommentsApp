using CommentsApp.Domain.Interfaces;
using Microsoft.Extensions.Hosting;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;

namespace CommentsApp.Infrastructure.Services;

public class FileStorageService : IFileStorageService
{
    private const int MaxWidth = 320;
    private const int MaxHeight = 240;
    private const long MaxTextFileSize = 100 * 1024; // 100 КБ

    private readonly string _uploadsPath;

    public FileStorageService(IHostEnvironment env)
    {
        _uploadsPath = Path.Combine(env.ContentRootPath, "Uploads");
        if (!Directory.Exists(_uploadsPath))
            Directory.CreateDirectory(_uploadsPath);
    }

    public async Task<FileUploadResult> SaveImageAsync(Stream fileStream, string fileName, CancellationToken cancellationToken)
    {
        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        var allowedExtensions = new[] { ".jpg", ".jpeg", ".gif", ".png" };

        if (!allowedExtensions.Contains(extension))
            return new FileUploadResult(false, null, null, 0, "Разрешены только форматы JPG, GIF, PNG");

        try
        {
            using var image = await Image.LoadAsync(fileStream, cancellationToken);

            //// Пропорционально уменьшаем, если превышает 320x240
            //if (image.Width > MaxWidth || image.Height > MaxHeight)
            //{
            //    image.Mutate(x => x.Resize(new ResizeOptions
            //    {
            //        Size = new Size(MaxWidth, MaxHeight),
            //        Mode = ResizeMode.Max // сохраняет пропорции, вписывает в рамку
            //    }));
            //}

            var safeFileName = $"{Guid.NewGuid()}{extension}";
            var fullPath = Path.Combine(_uploadsPath, safeFileName);

            await image.SaveAsync(fullPath, cancellationToken);

            var fileInfo = new FileInfo(fullPath);
            var contentType = extension switch
            {
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                ".gif" => "image/gif",
                _ => "application/octet-stream"
            };

            return new FileUploadResult(true, safeFileName, contentType, fileInfo.Length, null);
        }
        catch (Exception)
        {
            return new FileUploadResult(false, null, null, 0, "Не удалось обработать изображение");
        }
    }

    public async Task<FileUploadResult> SaveTextFileAsync(Stream fileStream, string fileName, long sizeBytes, CancellationToken cancellationToken)
    {
        var extension = Path.GetExtension(fileName).ToLowerInvariant();

        if (extension != ".txt")
            return new FileUploadResult(false, null, null, 0, "Разрешён только формат TXT");

        if (sizeBytes > MaxTextFileSize)
            return new FileUploadResult(false, null, null, 0, "Файл не должен превышать 100 КБ");

        var safeFileName = $"{Guid.NewGuid()}.txt";
        var fullPath = Path.Combine(_uploadsPath, safeFileName);

        using var fileOutput = new FileStream(fullPath, FileMode.Create);
        await fileStream.CopyToAsync(fileOutput, cancellationToken);

        return new FileUploadResult(true, safeFileName, "text/plain", sizeBytes, null);
    }

    // Вызывается из фона (consumer): уменьшает уже сохранённый файл "на месте".
    public async Task<long> ResizeImageAsync(string storedPath, CancellationToken cancellationToken)
    {
        // GetFileName — защита: работаем только внутри папки Uploads
        var fullPath = Path.Combine(_uploadsPath, Path.GetFileName(storedPath));

        using var image = await Image.LoadAsync(fullPath, cancellationToken);

        if (image.Width > MaxWidth || image.Height > MaxHeight)
        {
            image.Mutate(x => x.Resize(new ResizeOptions
            {
                Size = new Size(MaxWidth, MaxHeight),
                Mode = ResizeMode.Max // сохраняет пропорции, вписывает в рамку
            }));

            await image.SaveAsync(fullPath, cancellationToken);
        }

        return new FileInfo(fullPath).Length;
    }
}