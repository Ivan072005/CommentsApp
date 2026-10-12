import { useEffect, useState } from 'react';
import { getReplies } from '../api/commentApi';
import type { Comment } from './types';

interface LoadedState {
  parentId: number;
  items: Comment[];
  error: string | null;
}

// Загружает прямые ответы на комментарий parentId
export function useReplies(parentId: number) {
  const [state, setState] = useState<LoadedState | null>(null);

  useEffect(() => {
    let cancelled = false;

    getReplies(parentId)
      .then((items) => {
        if (!cancelled) setState({ parentId, items, error: null });
      })
      .catch(() => {
        if (!cancelled) setState({ parentId, items: [], error: 'Не удалось загрузить ответы' });
      });

    return () => { cancelled = true; };
  }, [parentId]);

  const current = state?.parentId === parentId ? state : null;

  return {
    replies: current?.items ?? [],
    loading: current === null,
    error: current?.error ?? null,
  };
}
