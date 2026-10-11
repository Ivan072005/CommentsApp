namespace CommentsApp.Domain.Entities;

public class Comment
{
    public int Id { get; set; }
    public int? ParentId { get; set; }
    public int UserId { get; set; }
    public string Text { get; set; } = null!;
    public DateTime CreatedAt { get; set; }

    public Comment? Parent { get; set; }
    public ICollection<Comment> Replies { get; set; } = new List<Comment>();
    public User User { get; set; } = null!;
    public ICollection<Attachment> Attachments { get; set; } = new List<Attachment>();
}