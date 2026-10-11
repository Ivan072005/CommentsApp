namespace CommentsApp.Infrastructure.Messaging;

// Содержимое записки. В очередь кладём только id, а не саму картинку.
public sealed record ImageResizeMessage(int AttachmentId);