namespace CommentsApp.Domain.Interfaces;

// "Положить записку на ленту": уменьшить картинку вложения с таким id.
public interface IImageResizeQueue
{
    Task EnqueueAsync(int attachmentId, CancellationToken cancellationToken);
}