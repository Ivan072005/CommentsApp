import { Fragment, useState, type ReactNode } from 'react';
import { RepliesToggle, type Comment, type SortBy } from '../../../entities/comment';
import { formatDate } from '../../../shared/lib/formatDate';
import { isSafeUrl } from '../../../shared/lib/isSafeUrl';
import styles from './CommentsTable.module.css';

interface CommentsTableProps {
  comments: Comment[];
  sortBy: SortBy;
  descending: boolean;
  onSort: (field: SortBy) => void;
  renderReplies: (comment: Comment) => ReactNode; // что показать под раскрытой строкой
}

const SORTABLE_COLUMNS: { field: SortBy; title: string }[] = [
  { field: 'userName', title: 'User Name' },
  { field: 'email', title: 'E-mail' },
  { field: 'date', title: 'Дата' },
];

export function CommentsTable({ comments, sortBy, descending, onSort, renderReplies }: CommentsTableProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          {SORTABLE_COLUMNS.map((col) => (
            <th key={col.field}>
              <button type="button" className={styles.sortButton} onClick={() => onSort(col.field)}>
                {col.title}
                {sortBy === col.field && (descending ? ' ▼' : ' ▲')}
              </button>
            </th>
          ))}
          <th>Комментарий</th>
          <th>Ответы</th>
        </tr>
      </thead>
      <tbody>
        {comments.length === 0 && (
          <tr>
            <td colSpan={5} className={styles.empty}>Комментариев пока нет</td>
          </tr>
        )}

        {comments.map((c) => (
          <Fragment key={c.id}>
            <tr>
              <td className={styles.nowrap}>
                {c.homePage && isSafeUrl(c.homePage) ? (
                  <a href={c.homePage} target="_blank" rel="noopener noreferrer nofollow">{c.userName}</a>
                ) : (
                  c.userName
                )}
              </td>
              <td>{c.email}</td>
              <td className={styles.nowrap}>{formatDate(c.createdAt)}</td>
              {/* Текст уже очищен сервером по белому списку тегов */}
              <td className={styles.text} dangerouslySetInnerHTML={{ __html: c.text }} />
              <td className={styles.nowrap}>
                {c.repliesCount > 0 ? (
                  <RepliesToggle count={c.repliesCount} open={expanded.has(c.id)} onToggle={() => toggle(c.id)} />
                ) : (
                  <span className={styles.muted}>—</span>
                )}
              </td>
            </tr>

            {expanded.has(c.id) && (
              <tr className={styles.expandedRow}>
                <td colSpan={5}>{renderReplies(c)}</td>
              </tr>
            )}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}
