# CommentsApp — SPA «Комментарии»

Одностраничное приложение для комментариев с каскадными ответами любой вложенности,
вложениями (картинки и TXT), CAPTCHA и обновлением в реальном времени.

**Backend:** ASP.NET Core (.NET 10), Clean Architecture, MediatR (CQRS), EF Core + PostgreSQL,
Redis, RabbitMQ, GraphQL (HotChocolate), SignalR.
**Frontend:** React 19 + TypeScript + Vite, Feature-Sliced Design.
**Инфраструктура:** Docker Compose (nginx, PostgreSQL, Redis, RabbitMQ).

---

## Быстрый старт (Docker)

Нужен только Docker Desktop.

```bash
git clone https://github.com/Ivan072005/CommentsApp.git
cd CommentsApp
docker compose up -d --build
```

Откройте **http://localhost:8080**. Первая сборка занимает 5–10 минут: скачиваются образы .NET SDK, Node и PostgreSQL.

Пароли можно задать в файле `.env` (образец — `.env.example`). Без `.env` используются значения по умолчанию,
которые подходят только для локального запуска.

| Адрес | Что это |
|---|---|
| http://localhost:8080 | приложение |
| http://localhost:8080/graphql | GraphQL + IDE Nitro |
| http://localhost:15672 | панель RabbitMQ |
| `localhost:5433` | PostgreSQL в Docker (для DBeaver / pgAdmin) |

Остановить: `docker compose down`. Удалить вместе с данными: `docker compose down -v`.

---

## Что реализовано

### Требования задания

| Требование | Реализация |
|---|---|
| Форма: User Name (латиница и цифры), E-mail, Home page, CAPTCHA, текст | валидация на клиенте и на сервере (FluentValidation) |
| CAPTCHA-картинка | генерируется на сервере (ImageSharp); код хранится в Redis 5 минут, одноразовый |
| Разрешённые теги `<a href title>`, `<code>`, `<i>`, `<strong>` | белый список на сервере, остальное экранируется; `href` — только http/https |
| Проверка закрытия тегов (валидный XHTML) | на клиенте и на сервере |
| Защита от XSS и SQL-инъекций | санитайзер HTML; EF Core — только параметризованные запросы |
| Каскадные ответы без ограничения вложенности | `comments.parent_id` → дерево; ветки подгружаются по клику через GraphQL |
| Заглавные комментарии — таблица с сортировкой по User Name, E-mail, дате | сортировка на сервере |
| 25 на страницу, по умолчанию LIFO | пагинация на сервере, по умолчанию — новые сверху |
| Картинки JPG/GIF/PNG, пропорционально до 320×240 | ресайз в фоне через очередь RabbitMQ |
| TXT до 100 КБ | проверка на клиенте и сервере |
| Lightbox с анимацией | картинки и TXT открываются поверх страницы |
| Панель `[i] [strong] [code] [a]` | оборачивает выделенный текст в тег |
| Предпросмотр без перезагрузки | безопасный (тот же белый список тегов) |
| Пользователь не дублируется | ищется по email, имя/сайт/IP/User-Agent обновляются |
| Сохраняются IP и User-Agent | реальный IP за nginx — через `X-Forwarded-For` |

### Дополнительно (Junior+ / Middle)

| Технология | Где используется |
|---|---|
| **Queue — RabbitMQ** | ресайз картинок вынесен из запроса в фоновый consumer (durable-очередь, persistent-сообщения, ручной ack) |
| **Cache — Redis** | первая страница комментариев; сбрасывается при новом комментарии |
| **NoSQL — Redis** | хранение кодов CAPTCHA (TTL, одноразовость) |
| **Events** | доменное событие `CommentCreatedEvent` (MediatR): сброс кэша и рассылка по WebSocket — независимые подписчики |
| **WebSocket — SignalR** | новые комментарии и ответы появляются у всех открытых вкладок без перезагрузки; индикатор `Live` в шапке |
| **GraphQL — HotChocolate** | дерево ответов; `DataLoader` — один SQL-запрос на уровень вложенности (без N+1) |
| **Docker** | весь стек одной командой, nginx как reverse proxy |

---

## Архитектура

```
Браузер ──► nginx (frontend) ──► отдаёт React (статические файлы)
                 │
                 ├── /api      REST: создание комментария, список, CAPTCHA
                 ├── /graphql  GraphQL: дерево ответов
                 ├── /hubs     SignalR (WebSocket): события в реальном времени
                 └── /uploads  загруженные файлы
                 ▼
             ASP.NET Core API ──► PostgreSQL   (данные)
                              ──► Redis        (CAPTCHA, кэш)
                              ──► RabbitMQ     (очередь ресайза картинок)
```

### Создание комментария

```
POST /api/Comments
  → CreateCommentCommandHandler:
      CAPTCHA → очистка HTML → проверка файла → сохранение (одна транзакция)
  → картинка → очередь RabbitMQ → ImageResizeConsumer уменьшает до 320×240
  → Publish(CommentCreatedEvent)
       ├─ InvalidateCommentsCacheHandler  → сброс кэша первой страницы в Redis
       └─ BroadcastCommentCreatedHandler  → SignalR: всем клиентам "CommentCreated"
```

### Backend — Clean Architecture

| Проект | Ответственность |
|---|---|
| `CommentsApp.Domain` | сущности (`User`, `Comment`, `Attachment`) и интерфейсы сервисов |
| `CommentsApp.Application` | команды и запросы MediatR, валидация, доменные события, кэш |
| `CommentsApp.Infrastructure` | EF Core, санитайзер, файлы и ресайз, CAPTCHA, RabbitMQ |
| `CommentsApp.Api` | REST-контроллеры, GraphQL, SignalR-хаб, middleware ошибок |

Ошибки валидации возвращаются как `400 { "Errors": [{ "Field", "Message" }] }`, и форма показывает их под нужными полями.

### Frontend — Feature-Sliced Design

```
src/
├── app/        точка входа
├── pages/      страница комментариев
├── widgets/    шапка, таблица комментариев, ветка ответов
├── features/   добавление комментария (форма, теги, предпросмотр, валидация)
├── entities/   комментарий, CAPTCHA: типы, API, хуки, карточка
└── shared/     HTTP/GraphQL/SignalR-клиенты, UI-компоненты, утилиты
```

---

## API

### REST

| Метод | Адрес | Описание |
|---|---|---|
| `GET` | `/api/Captcha` | `{ id, imageDataUri }` |
| `GET` | `/api/Comments?page=1&pageSize=25&sortBy=date\|userName\|email&descending=true` | заглавные комментарии |
| `GET` | `/api/Comments/{id}/replies` | прямые ответы |
| `POST` | `/api/Comments` | `multipart/form-data`: `UserName`, `Email`, `HomePage`, `Text`, `ParentId`, `CaptchaId`, `CaptchaCode`, `File` |
| `GET` | `/uploads/{file}` | загруженный файл |

При локальном запуске документация доступна в Scalar: https://localhost:7066/scalar.

### GraphQL

```graphql
{
  comments(page: 1, pageSize: 25, sortBy: "date", descending: true) {
    id userName text createdAt repliesCount
    attachments { url kind }
    replies {            # любая глубина — DataLoader, 1 запрос на уровень
      id text
      replies { id text }
    }
  }
}
```

Ограничение глубины запроса — 15 уровней (защита от тяжёлых запросов).

### SignalR

Хаб `/hubs/comments`, событие `CommentCreated` с тем же объектом комментария, что отдают REST и GraphQL.

---

## База данных

PostgreSQL, 3 таблицы: `users`, `comments` (самоссылка `parent_id` → дерево), `attachments`.

| Файл | Назначение |
|---|---|
| [`db/init.sql`](db/init.sql) | схема PostgreSQL; выполняется автоматически при первом запуске контейнера |
| [`db/mysql/schema.sql`](db/mysql/schema.sql) | та же схема в синтаксисе MySQL |
| [`db/mysql/comments_app.mwb`](db/mysql/comments_app.mwb) | модель для **MySQL Workbench** (EER-диаграмма) |

---

## Локальная разработка (без Docker для API и фронта)

Нужны: .NET 10 SDK, Node.js 22, Docker (для инфраструктуры).

```bash
# 1. Инфраструктура в Docker
docker compose up -d postgres redis rabbitmq

# 2. Настройки API: скопировать шаблон и вписать пароли
#    CommentsApp.Api/appsettings.Development.example.json -> appsettings.Development.json
#    (PostgreSQL из Docker: Host=localhost;Port=5433;Database=comments_app;...)

# 3. API: https://localhost:7066 (Scalar: /scalar)
dotnet run --project CommentsApp.Api

# 4. Frontend: http://localhost:5173
cd frontend
npm install
npm run dev
```

---

## Безопасность

- **XSS:** HTML комментария очищается на сервере по белому списку тегов и атрибутов; `href` — только http/https.
  TXT показывается как текст; файлы отдаются с `X-Content-Type-Options: nosniff`.
- **SQL-инъекции:** только EF Core (параметризованные запросы).
- **Файлы:** проверка расширения, картинка декодируется и пересохраняется (ImageSharp), имя на диске — GUID,
  наружу видна только папка `Uploads`.
- **CAPTCHA:** одноразовая, живёт 5 минут.
- **Секреты:** `.env` и `appsettings.Development.json` не попадают в Git, в репозитории только шаблоны.

---

## Git

`main` — релизы, `develop` — основная ветка, `feature/*` — задачи (merge `--no-ff`):
`feature/graphql`, `feature/frontend`, `feature/websocket`, `feature/ui-redesign`, `feature/docker`, `feature/docs`.
