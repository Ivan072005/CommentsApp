using System.Linq.Expressions;
using CommentsApp.Domain.Entities;

namespace CommentsApp.Application.Comments.Queries.GetComments;

public record AttachmentDto(
    int Id,
    string FileName,     // исходное имя, как загрузил пользователь
    string Url,          // относительный адрес: /uploads/<guid>.png
    string ContentType,
    string Kind,         // "image" | "text"
    int SizeBytes
);

public record CommentDto(
    int Id,
    int? ParentId,
    string UserName,
    string Email,
    string? HomePage,
    string Text,
    DateTime CreatedAt,
    int RepliesCount,                 // для кнопки "Показать ответы (N)"
    List<AttachmentDto> Attachments
);

public static class CommentProjections
{
    // Один "рецепт" превращения Comment -> CommentDto для всех запросов.
    // Это Expression, поэтому EF переводит его в SQL и берёт из БД только нужные поля.
    public static readonly Expression<Func<Comment, CommentDto>> ToDto = c => new CommentDto(
        c.Id,
        c.ParentId,
        c.User.UserName,
        c.User.Email,
        c.User.HomePage,
        c.Text,
        c.CreatedAt,
        c.Replies.Count(),
        c.Attachments
            .Select(a => new AttachmentDto(
                a.Id,
                a.FileName,
                "/uploads/" + a.StoredPath,
                a.ContentType,
                a.Kind == AttachmentKind.Image ? "image" : "text",
                a.SizeBytes))
            .ToList()
    );
}