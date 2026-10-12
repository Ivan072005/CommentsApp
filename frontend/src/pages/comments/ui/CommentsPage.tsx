import { useState } from 'react';
import { useCommentCreated, useTopComments, type SortBy } from '../../../entities/comment';
import { AddCommentForm } from '../../../features/add-comment';
import { CommentsTable } from '../../../widgets/comments-table';
import { RepliesBranch } from '../../../widgets/comment-thread';
import { Pagination } from '../../../shared/ui/Pagination';
import styles from './CommentsPage.module.css';

export function CommentsPage() {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [descending, setDescending] = useState(true); // LIFO: новые сверху
  const [reloadKey, setReloadKey] = useState(0);
  const [hasNewComments, setHasNewComments] = useState(false);

  const { comments, loading, error, hasNext } = useTopComments(page, sortBy, descending, reloadKey);

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

  // После нового комментария показываем первую страницу (новые сверху) и перезагружаем список
  const showNewest = () => {
    setSortBy('date');
    setDescending(true);
    setPage(1);
    setReloadKey((k) => k + 1);
    setHasNewComments(false);
  };

  // WebSocket: кто-то (в любой вкладке) добавил комментарий
  const isNewestView = page === 1 && sortBy === 'date' && descending;
  useCommentCreated((comment) => {
    if (comment.parentId === null && !isNewestView) {
      // пользователь листает другие страницы/сортировку — не сбиваем его, а предлагаем показать
      setHasNewComments(true);
      return;
    }
    // новая строка сверху или изменился счётчик ответов — перезагружаем список
    setReloadKey((k) => k + 1);
  });

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }}>
      <h1>Комментарии</h1>

      <h2 style={{ fontSize: 18 }}>Оставить комментарий</h2>
      <AddCommentForm onCreated={showNewest} />

      {hasNewComments && (
        <div className={styles.newBanner}>
          Появились новые комментарии
          <button type="button" className={styles.newButton} onClick={showNewest}>
            Показать
          </button>
        </div>
      )}

      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <div style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
        <CommentsTable
          comments={comments}
          sortBy={sortBy}
          descending={descending}
          onSort={handleSort}
          renderReplies={(c, branchReloadKey) => <RepliesBranch parentId={c.id} reloadKey={branchReloadKey} />}
          onReplyCreated={() => setReloadKey((k) => k + 1)}
        />
      </div>

      <Pagination page={page} hasNext={hasNext} onChange={setPage} />
    </main>
  );
}
