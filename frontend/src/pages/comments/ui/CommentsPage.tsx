import { useState } from 'react';
import { useTopComments, type SortBy } from '../../../entities/comment';
import { CommentsTable } from '../../../widgets/comments-table';
import { RepliesBranch } from '../../../widgets/comment-thread';
import { Pagination } from '../../../shared/ui/Pagination';

export function CommentsPage() {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [descending, setDescending] = useState(true); // LIFO: новые сверху

  const { comments, loading, error, hasNext } = useTopComments(page, sortBy, descending);

  // Клик по той же колонке — меняем направление; по новой — сортируем по ней
  const handleSort = (field: SortBy) => {
    if (field === sortBy) {
      setDescending((d) => !d);
    } else {
      setSortBy(field);
      setDescending(field === 'date'); // дата: новые сверху; имя/email: А→Я
    }
    setPage(1);
  };

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }}>
      <h1>Комментарии</h1>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <div style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
        <CommentsTable
          comments={comments}
          sortBy={sortBy}
          descending={descending}
          onSort={handleSort}
          renderReplies={(c) => <RepliesBranch parentId={c.id} />}
        />
      </div>

      <Pagination page={page} hasNext={hasNext} onChange={setPage} />
    </main>
  );
}
