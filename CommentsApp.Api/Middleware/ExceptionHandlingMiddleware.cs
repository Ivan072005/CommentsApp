using FluentValidation;
using System.Net;
using System.Text.Json;

namespace CommentsApp.Api.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;

    public ExceptionHandlingMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (ValidationException ex)
        {
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = (int)HttpStatusCode.BadRequest;

            var errors = ex.Errors.Select(e => new { Field = e.PropertyName, Message = e.ErrorMessage });
            await context.Response.WriteAsync(JsonSerializer.Serialize(new { Errors = errors }));
        }
        catch (Exception)
        {
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
            await context.Response.WriteAsync(JsonSerializer.Serialize(new { Error = "Внутренняя ошибка сервера" }));
        }
    }
}