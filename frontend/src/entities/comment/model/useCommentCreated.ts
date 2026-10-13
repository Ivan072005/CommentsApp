import { useEffect, useEffectEvent } from 'react';
import { subscribe } from '../../../shared/api/realtime';
import type { Comment } from './types';

// Имя события — то же, что CommentsHub.CommentCreatedMethod на сервере
const COMMENT_CREATED = 'CommentCreated';

// Вызывает handler, когда КТО УГОДНО (в любой вкладке/браузере) добавил комментарий.
export function useCommentCreated(handler: (comment: Comment) => void) {
  // useEffectEvent: всегда вызывается самая свежая версия handler,
  // при этом подписка создаётся один раз и не пересоздаётся на каждый рендер
  const onCommentCreated = useEffectEvent(handler);

  useEffect(() => subscribe<Comment>(COMMENT_CREATED, (comment) => onCommentCreated(comment)), []);
}
