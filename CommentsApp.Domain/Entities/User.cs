namespace CommentsApp.Domain.Entities;

public class User
{
    public int Id { get; set; }
    public string UserName { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? HomePage { get; set; }
    public string IpAddress { get; set; } = null!;
    public string? UserAgent { get; set; }
    public DateTime CreatedAt { get; set; }

    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
}