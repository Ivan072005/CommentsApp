using CommentsApp.Application.Behaviors;
using CommentsApp.Domain.Interfaces;
using CommentsApp.Infrastructure.Messaging;
using CommentsApp.Infrastructure.Persistence;
using CommentsApp.Infrastructure.Services;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddScoped<IFileStorageService, FileStorageService>();
builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddScoped<ICommentSanitizer, CommentSanitizer>();
builder.Services.Configure<RabbitMqOptions>(builder.Configuration.GetSection("RabbitMq"));
builder.Services.AddSingleton<RabbitMqConnectionProvider>();
builder.Services.AddHostedService<ImageResizeConsumer>();
builder.Services.AddSingleton<IImageResizeQueue, RabbitMqImageResizeQueue>();

var corsOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>()
                  ?? new[] { "http://localhost:5173" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy => policy
        .WithOrigins(corsOrigins)
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials()); // понадобится для SignalR
});


builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration.GetConnectionString("Redis");
});
builder.Services.AddScoped<ICaptchaService, CaptchaService>();
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(typeof(CommentsApp.Application.Comments.Commands.CreateComment.CreateCommentCommand).Assembly);
    cfg.AddOpenBehavior(typeof(ValidationBehavior<,>));
});

builder.Services.AddValidatorsFromAssembly(typeof(CommentsApp.Application.Comments.Commands.CreateComment.CreateCommentCommand).Assembly);

var app = builder.Build();

app.UseMiddleware<CommentsApp.Api.Middleware.ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseHttpsRedirection();

app.UseCors("Frontend");

// Раздача загруженных файлов: https://localhost:7066/uploads/<stored_path>
var uploadsPath = Path.Combine(app.Environment.ContentRootPath, "Uploads");
Directory.CreateDirectory(uploadsPath);

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsPath), // наружу видна ТОЛЬКО папка Uploads
    RequestPath = "/uploads",
    OnPrepareResponse = ctx =>
    {
        var headers = ctx.Context.Response.Headers;
        // Браузер не будет "угадывать" тип: TXT никогда не исполнится как HTML/JS
        headers["X-Content-Type-Options"] = "nosniff";

        // Кириллица в TXT отображается правильно
        if (ctx.File.Name.EndsWith(".txt", StringComparison.OrdinalIgnoreCase))
            headers.ContentType = "text/plain; charset=utf-8";
    }
});

app.UseAuthorization();
app.MapControllers();
app.Run();