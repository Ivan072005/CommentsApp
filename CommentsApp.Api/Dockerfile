# ---------- 1. Сборка ----------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Сначала только .csproj — тогда restore кэшируется и не повторяется при каждом изменении кода
COPY CommentsApp.Api/CommentsApp.Api.csproj CommentsApp.Api/
COPY CommentsApp.Application/CommentsApp.Application.csproj CommentsApp.Application/
COPY CommentsApp.Domain/CommentsApp.Domain.csproj CommentsApp.Domain/
COPY CommentsApp.Infrastructure/CommentsApp.Infrastructure.csproj CommentsApp.Infrastructure/
RUN dotnet restore CommentsApp.Api/CommentsApp.Api.csproj

COPY . .
RUN dotnet publish CommentsApp.Api/CommentsApp.Api.csproj -c Release -o /app/publish --no-restore /p:UseAppHost=false

# ---------- 2. Запуск (лёгкий образ без SDK) ----------
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime

# В Linux-образе нет шрифтов — без них капча не нарисуется
RUN apt-get update \
    && apt-get install -y --no-install-recommends fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /app/publish .

# Папка загрузок принадлежит непривилегированному пользователю "app" (его создаёт базовый образ)
RUN mkdir -p /app/Uploads && chown -R $APP_UID /app/Uploads
USER $APP_UID

ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "CommentsApp.Api.dll"]
