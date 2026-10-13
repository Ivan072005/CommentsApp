-- =====================================================================
-- CommentsApp — схема БД в формате MySQL 8 (для MySQL Workbench).
--
-- Рабочая БД проекта — PostgreSQL (db/init.sql). Этот файл — та же схема
-- в синтаксисе MySQL, чтобы открыть её в MySQL Workbench и получить
-- EER-диаграмму (db/mysql/comments_app.mwb):
--   File -> New Model
--   File -> Import -> Reverse Engineer MySQL Create Script... -> этот файл
--   (галочка "Place imported objects on a diagram") -> Execute
--   File -> Save Model As... -> db/mysql/comments_app.mwb
--
-- Нормализация: пользователь (users) хранится один раз и находится по email;
-- комментарии (comments) ссылаются на пользователя и на родительский
-- комментарий (дерево ответов любой глубины); файлы — в отдельной таблице
-- attachments (у комментария может быть вложение).
-- =====================================================================

CREATE DATABASE IF NOT EXISTS comments_app
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

USE comments_app;

-- Автор комментария (один на email)
CREATE TABLE users (
    id          INT          NOT NULL AUTO_INCREMENT,
    user_name   VARCHAR(50)  NOT NULL COMMENT 'Только латиница и цифры',
    email       VARCHAR(255) NOT NULL,
    home_page   VARCHAR(255) NULL     COMMENT 'Необязательный URL (http/https)',
    ip_address  VARCHAR(45)  NOT NULL COMMENT 'IPv4 или IPv6',
    user_agent  VARCHAR(500) NULL,
    created_at  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT 'UTC',
    PRIMARY KEY (id),
    INDEX idx_users_user_name (user_name),
    INDEX idx_users_email (email)
) ENGINE = InnoDB COMMENT = 'Авторы комментариев';

-- Комментарий или ответ (parent_id = NULL -> заглавный комментарий)
CREATE TABLE comments (
    id          INT         NOT NULL AUTO_INCREMENT,
    parent_id   INT         NULL     COMMENT 'Родительский комментарий; NULL — заглавный',
    user_id     INT         NOT NULL,
    text        TEXT        NOT NULL COMMENT 'Очищенный HTML: только <a href title>, <code>, <i>, <strong>',
    created_at  DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT 'UTC',
    PRIMARY KEY (id),
    INDEX idx_comments_parent_id (parent_id),
    INDEX idx_comments_created_at (created_at),
    INDEX idx_comments_user_id (user_id),
    CONSTRAINT fk_comments_parent
        FOREIGN KEY (parent_id) REFERENCES comments (id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB COMMENT = 'Комментарии и ответы (дерево любой глубины)';

-- Вложение комментария: картинка (JPG/GIF/PNG, уменьшена до 320x240) или TXT до 100 КБ
CREATE TABLE attachments (
    id            INT          NOT NULL AUTO_INCREMENT,
    comment_id    INT          NOT NULL,
    file_name     VARCHAR(255) NOT NULL COMMENT 'Исходное имя файла',
    stored_path   VARCHAR(500) NOT NULL COMMENT 'Имя файла на диске (GUID)',
    content_type  VARCHAR(100) NOT NULL,
    size_bytes    INT          NOT NULL,
    kind          VARCHAR(10)  NOT NULL COMMENT 'image | text',
    PRIMARY KEY (id),
    INDEX idx_attachments_comment_id (comment_id),
    CONSTRAINT ck_attachments_kind CHECK (kind IN ('image', 'text')),
    CONSTRAINT fk_attachments_comment
        FOREIGN KEY (comment_id) REFERENCES comments (id) ON DELETE CASCADE
) ENGINE = InnoDB COMMENT = 'Файлы, прикреплённые к комментариям';
