import { useEffect, useState } from 'react';
import { getComments, type Comment } from '../../../entities/comment';

export function CommentsPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false; // защита: не обновлять state, если компонент уже ушёл

    getComments({ page: 1, pageSize: 25, sortBy: 'date', descending: true })
      .then((data) => { if (!cancelled) setComments(data); })
      .catch(() => { if (!cancelled) setError('Не удалось загрузить комментарии'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  if (loading) return <p>Загрузка…</p>;
  if (error) return <p style={{ color: 'crimson' }}>{error}</p>;

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: 16 }}>
      <h1>Комментарии</h1>
      {comments.map((c) => (
        <article key={c.id} style={{ borderBottom: '1px solid #444', padding: '8px 0' }}>
          <b>{c.userName}</b>{' '}
          <small>{new Date(c.createdAt).toLocaleString()}</small>
          {/* Текст уже очищен сервером по белому списку тегов */}
          <div dangerouslySetInnerHTML={{ __html: c.text }} />
          {c.repliesCount > 0 && <small>Ответов: {c.repliesCount}</small>}
        </article>
      ))}
    </main>
  );
}