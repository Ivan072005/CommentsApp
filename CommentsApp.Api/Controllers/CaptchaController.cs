using CommentsApp.Domain.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace CommentsApp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CaptchaController : ControllerBase
{
    private readonly ICaptchaService _captcha;

    public CaptchaController(ICaptchaService captcha)
    {
        _captcha = captcha;
    }

    [HttpGet]
    public async Task<ActionResult<CaptchaChallenge>> Get(CancellationToken cancellationToken)
    {
        return Ok(await _captcha.GenerateAsync(cancellationToken));
    }
}