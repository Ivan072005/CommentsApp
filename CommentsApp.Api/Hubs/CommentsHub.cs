using Microsoft.AspNetCore.SignalR;

namespace CommentsApp.Api.Hubs;

// SignalR-хаб: "радиоточка", к которой подключаются браузеры по WebSocket.
// Здесь он только рассылает события сервер -> браузеры, методов для вызова с клиента нет:
// комментарии создаются через REST POST /api/Comments.
public sealed class CommentsHub : Hub
{
    public const string Route = "/hubs/comments";

    // Имя события, на которое подписывается фронтенд: connection.on("CommentCreated", ...)
    public const string CommentCreatedMethod = "CommentCreated";
}
