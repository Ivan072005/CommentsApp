using CommentsApp.Application.Comments.Events;
using CommentsApp.Domain.Entities;
using CommentsApp.Domain.Interfaces;
using CommentsApp.Infrastructure.Persistence;
using FluentValidation;
using FluentValidation.Results;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CommentsApp.Application.Comments.Commands.CreateComment;

public class CreateCommentCommandHandler : IRequestHandler<CreateCommentCommand, int>
{
    private readonly AppDbContext _db;
    private readonly ICommentSanitizer _sanitizer;
    private readonly IFileStorageService _fileStorage;
    private readonly ICaptchaService _captcha;
    private readonly IImageResizeQueue _imageResizeQueue;
    private readonly IPublisher _publisher;

    public CreateCommentCommandHandler(
        AppDbContext db,
        ICommentSanitizer sanitizer,
        IFileStorageService fileStorage,
        ICaptchaService captcha,
        IImageResizeQueue imageResizeQueue,
        IPublisher publisher)
    {
        _db = db;
        _sanitizer = sanitizer;
        _fileStorage = fileStorage;
        _captcha = captcha;
        _imageResizeQueue = imageResizeQueue;
        _publisher = publisher;
    }

    public async Task<int> Handle(CreateCommentCommand request, CancellationToken cancellationToken)
    {
        // 1. Капча (одноразовая, код удаляется после проверки)
        if (!await _captcha.ValidateAsync(request.CaptchaId, request.CaptchaCode, cancellationToken))
            throw Fail("CaptchaCode", "Неверный или просроченный код капчи");

        // 2. Санитайзинг текста
        var sanitizeResult = _sanitizer.Sanitize(request.Text);
        if (!sanitizeResult.IsValid)
            throw Fail("Text", sanitizeResult.ErrorMessage ?? "Недопустимый текст комментария");

        // 3. Родительский комментарий должен существовать (иначе БД выдаст ошибку внешнего ключа -> 500)
        if (request.ParentId is not null &&
            !await _db.Comments.AnyAsync(c => c.Id == request.ParentId, cancellationToken))
            throw Fail("ParentId", "Комментарий, на который вы отвечаете, не найден");

        // 4. Файл — проверяем и сохраняем на диск ДО записи в БД
        Attachment? attachment = null;

        if (request.File is not null && request.File.Length > 0)
        {
            var fileName = request.File.FileName;
            var extension = Path.GetExtension(fileName).ToLowerInvariant();
            var isImage = extension is ".jpg" or ".jpeg" or ".gif" or ".png";
            var isText = extension == ".txt";

            if (!isImage && !isText)
                throw Fail("File", "Разрешены только изображения (JPG, GIF, PNG) или текстовые файлы (TXT)");

            using var stream = request.File.OpenReadStream();

            var result = isImage
                ? await _fileStorage.SaveImageAsync(stream, fileName, cancellationToken)
                : await _fileStorage.SaveTextFileAsync(stream, fileName, request.File.Length, cancellationToken);

            if (!result.IsValid)
                throw Fail("File", result.ErrorMessage ?? "Не удалось сохранить файл");

            attachment = new Attachment
            {
                FileName = fileName,
                StoredPath = result.StoredPath!,
                ContentType = result.ContentType!,
                SizeBytes = (int)result.SizeBytes,
                Kind = isImage ? AttachmentKind.Image : AttachmentKind.Text
            };
        }

        // 5. Пользователь: ищем по email, иначе создаём
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == request.Email, cancellationToken);

        if (user is null)
        {
            user = new User
            {
                UserName = request.UserName,
                Email = request.Email,
                HomePage = request.HomePage,
                IpAddress = request.IpAddress,
                UserAgent = request.UserAgent,
                CreatedAt = DateTime.UtcNow
            };
            _db.Users.Add(user);
        }
        else
        {
            user.UserName = request.UserName;
            user.HomePage = request.HomePage;
            user.IpAddress = request.IpAddress;
            user.UserAgent = request.UserAgent;
        }

        // 6. Комментарий (+ вложение) — связываем через навигационные свойства,
        //    EF сам расставит user_id и comment_id
        var comment = new Comment
        {
            ParentId = request.ParentId,
            User = user,
            Text = sanitizeResult.SanitizedText!,
            CreatedAt = DateTime.UtcNow
        };

        if (attachment is not null)
            comment.Attachments.Add(attachment);

        _db.Comments.Add(comment);

        // Один SaveChanges = одна транзакция: пользователь, комментарий и вложение — всё или ничего
        await _db.SaveChangesAsync(cancellationToken);

        // 7. Картинку уменьшаем в фоне через RabbitMQ
        if (attachment is { Kind: AttachmentKind.Image })
        {
            try
            {
                await _imageResizeQueue.EnqueueAsync(attachment.Id, cancellationToken);
            }
            catch
            {
                // RabbitMQ недоступен — уменьшаем сразу, чтобы не хранить огромный файл
                var newSize = await _fileStorage.ResizeImageAsync(attachment.StoredPath, cancellationToken);
                attachment.SizeBytes = (int)newSize;
                await _db.SaveChangesAsync(cancellationToken);
            }
        }

        // 8. Событие "комментарий создан" -> сброс кэша + рассылка всем через SignalR.
        //    CancellationToken.None: рассылку доводим до конца, даже если автор уже закрыл вкладку.
        await _publisher.Publish(new CommentCreatedEvent(comment.Id, comment.ParentId), CancellationToken.None);

        return comment.Id;
    }

    // Единый формат ошибки: middleware превратит её в 400 { Errors: [{ Field, Message }] }
    private static ValidationException Fail(string field, string message) =>
        new(new[] { new ValidationFailure(field, message) });
}