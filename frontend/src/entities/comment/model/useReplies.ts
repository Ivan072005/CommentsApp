import { useEffect, useState } from 'react';
import { getReplies } from '../api/commentApi';
import type { Comment } from './types';

interface LoadedState {
  key: string;
  items: Comment[];
  error: string | null;
}

// Загружает прямые ответы на комментарий parentId.
// reloadKey: увеличь его, чтобы перезагрузить ветку (например, после нового ответа).
export function useReplies(parentId: number, reloadKey = 0) {
  const key = `${parentId}|${reloadKey}`;
  const [state, setState] = useState<LoadedState | null>(null);

  useEffect(() => {
    let cancelled = false;

    getReplies(parentId)
      .then((items) => {
        if (!cancelled) setState({ key, items, error: null });
      })
      .catch(() => {
        if (!cancelled) setState({ key, items: [], error: 'Не удалось загрузить ответы' });
      });

    return () => { cancelled = true; };
  }, [key, parentId]);

  const current = state?.key === key ? state : null;

  return {
    // пока перезагружается — показываем прежние ответы, чтобы ветка не "мигала"
    replies: current?.items ?? state?.items ?? [],
    loading: state === null,
    error: current?.error ?? null,
  };
}
