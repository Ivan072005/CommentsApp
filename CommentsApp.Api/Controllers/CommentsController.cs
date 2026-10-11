using CommentsApp.Application.Comments.Commands.CreateComment;
using CommentsApp.Application.Comments.Queries.GetComments;
using CommentsApp.Application.Comments.Queries.GetCommentReplies;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace CommentsApp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CommentsController : ControllerBase
{
    private readonly IMediator _mediator;

    public CommentsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<int>> CreateComment(
        [FromForm] CreateCommentRequest request,
        CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var userAgent = Request.Headers.UserAgent.ToString();

        // именованные аргументы: все string-поля одного типа, порядок легко перепутать
        var command = new CreateCommentCommand(
            UserName: request.UserName,
            CaptchaId: request.CaptchaId,
            CaptchaCode: request.CaptchaCode,
            Email: request.Email,
            HomePage: request.HomePage,
            Text: request.Text,
            ParentId: request.ParentId,
            IpAddress: ipAddress,
            UserAgent: userAgent,
            File: request.File
        );

        var commentId = await _mediator.Send(command, cancellationToken);
        return Ok(new { Id = commentId });
    }

    [HttpGet]
    public async Task<ActionResult<List<CommentDto>>> GetComments(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] string sortBy = "date",
        [FromQuery] bool descending = true,
        CancellationToken cancellationToken = default)
    {
        var query = new GetCommentsQuery(page, pageSize, sortBy, descending);
        var comments = await _mediator.Send(query, cancellationToken);
        return Ok(comments);
    }

    [HttpGet("{id}/replies")]
    public async Task<ActionResult<List<CommentDto>>> GetReplies(
        int id,
        CancellationToken cancellationToken)
    {
        var query = new GetCommentRepliesQuery(id);
        var replies = await _mediator.Send(query, cancellationToken);
        return Ok(replies);
    }
}

public class CreateCommentRequest
{
    public string UserName { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? HomePage { get; set; }
    public string Text { get; set; } = null!;
    public int? ParentId { get; set; }
    public string CaptchaId { get; set; } = null!;
    public string CaptchaCode { get; set; } = null!;
    public IFormFile? File { get; set; }
}