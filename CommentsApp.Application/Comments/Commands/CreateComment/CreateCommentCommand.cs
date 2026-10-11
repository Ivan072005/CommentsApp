using MediatR;
using Microsoft.AspNetCore.Http;

namespace CommentsApp.Application.Comments.Commands.CreateComment;

public record CreateCommentCommand(
    string UserName,
    string CaptchaId,
    string CaptchaCode,
    string Email,
    string? HomePage,
    string Text,
    int? ParentId,
    string IpAddress,
    string? UserAgent,
    IFormFile? File
) : IRequest<int>;