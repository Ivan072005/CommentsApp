import type { Comment, SortBy } from '../../../entities/comment';
import { formatDate } from '../../../shared/lib/formatDate';
import styles from './CommentsTable.module.css';

interface CommentsTableProps {
  comments: Comment[];
  sortBy: SortBy;
  descending: boolean;
  onSort: (field: SortBy) => void;
}

const SORTABLE_COLUMNS: { field: SortBy; title: string }[] = [
  { field: 'userName', title: 'User Name' },
  { field: 'email', title: 'E-mail' },
  { field: 'date', title: 'Дата' },
];

// Ссылку на домашнюю страницу показываем только для http/https (защита от javascript:)
const isSafeUrl = (url: string) => /^https?:\/\//i.test(url);

export function CommentsTable({ comments, sortBy, descending, onSort }: CommentsTableProps) {
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
          <tr key={c.id}>
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
            <td className={styles.center}>{c.repliesCount}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}