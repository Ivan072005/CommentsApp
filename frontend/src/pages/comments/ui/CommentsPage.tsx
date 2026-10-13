import { useState } from 'react';
import { useCommentCreated, useTopComments, type SortBy } from '../../../entities/comment';
import { AddCommentForm } from '../../../features/add-comment';
import { AppHeader } from '../../../widgets/app-header';
import { CommentsTable } from '../../../widgets/comments-table';
import { RepliesBranch } from '../../../widgets/comment-thread';
import { Pagination } from '../../../shared/ui/Pagination';
import styles from './CommentsPage.module.css';

const HIGHLIGHT_MS = 3000;

export function CommentsPage() {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [descending, setDescending] = useState(true); // LIFO: новые сверху
  const [reloadKey, setReloadKey] = useState(0);
  const [hasNewComments, setHasNewComments] = useState(false);
  const [freshIds, setFreshIds] = useState<Set<number>>(() => new Set());

  const { comments, loading, error, hasNext } = useTopComments(page, sortBy, descending, reloadKey);

  // Подсветить строку нового комментария на несколько секунд
  const highlight = (id: number) => {
    setFreshIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setFreshIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, HIGHLIGHT_MS);
  };

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

  // Показать первую страницу (новые сверху) и перезагрузить список
  const showNewest = () => {
    setSortBy('date');
    setDescending(true);
    setPage(1);
    setReloadKey((k) => k + 1);
    setHasNewComments(false);
  };

  const handleOwnCreated = (id: number) => {
    showNewest();
    highlight(id);
  };

  // WebSocket: кто-то (в любой вкладке) добавил комментарий
  const isNewestView = page === 1 && sortBy === 'date' && descending;
  useCommentCreated((comment) => {
    if (comment.parentId === null) {
      if (!isNewestView) {
        // пользователь листает другие страницы/сортировку — не сбиваем его, а предлагаем показать
        setHasNewComments(true);
        return;
      }
      highlight(comment.id);
    }
    // новая строка сверху или изменился счётчик ответов — перезагружаем список
    setReloadKey((k) => k + 1);
  });

  return (
    <>
      <AppHeader />

      <main className={styles.main}>
        <section className={styles.hero}>
          <h1 className={styles.heading}>
            Обсуждение <span className={styles.gradientText}>в реальном времени</span>
          </h1>
        </section>

        <AddCommentForm title="Новый комментарий" onCreated={handleOwnCreated} />

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Комментарии</h2>
            {loading && <span className={styles.spinner} aria-label="Загрузка" />}
          </div>

          {hasNewComments && (
            <div className={styles.newBanner}>
              Появились новые комментарии
              <button type="button" className={styles.newButton} onClick={showNewest}>
                Показать
              </button>
            </div>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <div className={loading ? styles.loading : undefined}>
            <CommentsTable
              comments={comments}
              sortBy={sortBy}
              descending={descending}
              onSort={handleSort}
              freshIds={freshIds}
              renderReplies={(c, branchReloadKey) => <RepliesBranch parentId={c.id} reloadKey={branchReloadKey} />}
              onReplyCreated={() => setReloadKey((k) => k + 1)}
            />
          </div>

          <Pagination page={page} hasNext={hasNext} onChange={setPage} />
        </section>
      </main>
    </>
  );
}
