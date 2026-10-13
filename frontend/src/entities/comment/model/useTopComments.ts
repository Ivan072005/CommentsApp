import { useEffect, useState } from 'react';
import { getComments } from '../api/commentApi';
import type { Comment, SortBy } from './types';

export const PAGE_SIZE = 25;

interface LoadedState {
  key: string;          // для каких параметров эти данные
  items: Comment[];
  error: string | null;
}

// Загружает заглавные комментарии для страницы/сортировки.
// reloadKey: увеличь его, чтобы перезагрузить список (например, после добавления комментария).
// Пока грузится новое — отдаёт старые данные (без мигания таблицы).
export function useTopComments(page: number, sortBy: SortBy, descending: boolean, reloadKey = 0) {
  const key = `${page}|${sortBy}|${descending}|${reloadKey}`;
  const [state, setState] = useState<LoadedState | null>(null);

  useEffect(() => {
    let cancelled = false;

    getComments({ page, pageSize: PAGE_SIZE, sortBy, descending })
      .then((items) => {
        if (!cancelled) setState({ key, items, error: null });
      })
      .catch(() => {
        if (!cancelled) setState({ key, items: [], error: 'Не удалось загрузить комментарии' });
      });

    return () => { cancelled = true; };
  }, [key, page, sortBy, descending]);

  return {
    comments: state?.items ?? [],
    loading: state?.key !== key,                       // данные ещё не для текущих параметров
    error: state?.key === key ? state.error : null,
    hasNext: (state?.items.length ?? 0) === PAGE_SIZE, // пришла полная страница -> возможно, есть следующая
  };
}
