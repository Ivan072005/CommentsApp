using CommentsApp.Api.GraphQL;
using CommentsApp.Api.Hubs;
using CommentsApp.Api.Middleware;
using CommentsApp.Application.Behaviors;
using CommentsApp.Application.Comments.Commands.CreateComment;
using CommentsApp.Domain.Interfaces;
using CommentsApp.Infrastructure.Messaging;
using CommentsApp.Infrastructure.Persistence;
using CommentsApp.Infrastructure.Services;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

// =====================================================================
// 1. СЕРВИСЫ
// =====================================================================

// ---------- Web API: контроллеры и документация (Scalar) ----------
builder.Services.AddControllers();
builder.Services.AddOpenApi();

// ---------- CORS: какие сайты могут обращаться к API ----------
var corsOrigins = config.GetSection("Cors:Origins").Get<string[]>()
                  ?? ["http://localhost:5173"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy => policy
        .WithOrigins(corsOrigins)
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials()); // нужно для SignalR
});

// ---------- База данных (PostgreSQL) ----------
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(config.GetConnectionString("DefaultConnection")));

// ---------- Redis: коды капчи + кэш первой страницы комментариев ----------
builder.Services.AddStackExchangeRedisCache(options =>
    options.Configuration = config.GetConnectionString("Redis"));

// ---------- RabbitMQ: очередь ресайза картинок ----------
builder.Services.Configure<RabbitMqOptions>(config.GetSection("RabbitMq"));
builder.Services.AddSingleton<RabbitMqConnectionProvider>();
builder.Services.AddSingleton<IImageResizeQueue, RabbitMqImageResizeQueue>();
builder.Services.AddHostedService<ImageResizeConsumer>();

// ---------- Сервисы приложения ----------
builder.Services.AddScoped<ICaptchaService, CaptchaService>();
builder.Services.AddScoped<ICommentSanitizer, CommentSanitizer>();
builder.Services.AddScoped<IFileStorageService, FileStorageService>();

// ---------- MediatR + FluentValidation (слой Application) ----------
var applicationAssembly = typeof(CreateCommentCommand).Assembly;

builder.Services.AddMediatR(cfg =>
{
    // Application — команды/запросы/обработчики событий; Api — обработчик рассылки через SignalR
    cfg.RegisterServicesFromAssemblies(applicationAssembly, typeof(Program).Assembly);
    cfg.AddOpenBehavior(typeof(ValidationBehavior<,>));
});
builder.Services.AddValidatorsFromAssembly(applicationAssembly);

// ---------- SignalR (WebSocket): мгновенная рассылка новых комментариев ----------
builder.Services.AddSignalR();

// ---------- GraphQL (HotChocolate) ----------
builder.Services
    .AddGraphQLServer()
    .AddQueryType<Query>()
    .AddTypeExtension<CommentRepliesExtension>()
    .AddDataLoader<RepliesByParentIdDataLoader>()
    .AddMaxExecutionDepthRule(15); // запрос глубже 15 уровней будет отклонён

// =====================================================================
// 2. КОНВЕЙЕР ОБРАБОТКИ ЗАПРОСА (порядок важен!)
// =====================================================================
var app = builder.Build();

// Ловит ошибки всех следующих шагов -> 400 / 500 в JSON
app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(); // /scalar
}

// HTTPS-редирект — только при локальном запуске.
// В Docker API работает за nginx по HTTP (HTTPS снимает внешний прокси/хостинг),
// а реальный IP пользователя приходит в X-Forwarded-For (ASPNETCORE_FORWARDEDHEADERS_ENABLED).
if (app.Environment.IsDevelopment())
    app.UseHttpsRedirection();
app.UseCors("Frontend");

// ---------- Загруженные файлы: /uploads/<stored_path> ----------
var uploadsPath = System.IO.Path.Combine(app.Environment.ContentRootPath, "Uploads");
Directory.CreateDirectory(uploadsPath);

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsPath), // наружу видна ТОЛЬКО папка Uploads
    RequestPath = "/uploads",
    OnPrepareResponse = ctx =>
    {
        var headers = ctx.Context.Response.Headers;

        // Браузер не "угадывает" тип: TXT никогда не исполнится как HTML/JS
        headers["X-Content-Type-Options"] = "nosniff";

        // Кириллица в TXT отображается правильно
        if (ctx.File.Name.EndsWith(".txt", StringComparison.OrdinalIgnoreCase))
            headers.ContentType = "text/plain; charset=utf-8";
    }
});

app.UseAuthorization();

// ---------- Эндпоинты ----------
app.MapControllers(); // REST:    /api/...
app.MapGraphQL();     // GraphQL: /graphql
app.MapHub<CommentsHub>(CommentsHub.Route); // WebSocket: /hubs/comments

app.Run();