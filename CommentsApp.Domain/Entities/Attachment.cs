namespace CommentsApp.Domain.Entities;

public enum AttachmentKind
{
    Image,
    Text
}

public class Attachment
{
    public int Id { get; set; }
    public int CommentId { get; set; }
    public string FileName { get; set; } = null!;
    public string StoredPath { get; set; } = null!;
    public string ContentType { get; set; } = null!;
    public int SizeBytes { get; set; }
    public AttachmentKind Kind { get; set; }

    public Comment Comment { get; set; } = null!;
}