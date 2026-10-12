import { Fragment, useState, type ReactNode } from 'react';
import { AttachmentList, RepliesToggle, type Comment, type SortBy } from '../../../entities/comment';
import { AddCommentForm } from '../../../features/add-comment';
import { formatDate } from '../../../shared/lib/formatDate';
import { isSafeUrl } from '../../../shared/lib/isSafeUrl';
import styles from './CommentsTable.module.css';

interface CommentsTableProps {
  comments: Comment[];
  sortBy: SortBy;
  descending: boolean;
  onSort: (field: SortBy) => void;
  // что показать под раскрытой строкой; reloadKey растёт после нового ответа
  renderReplies: (comment: Comment, reloadKey: number) => ReactNode;
  onReplyCreated: () => void; // обновить список (чтобы пересчитался счётчик ответов)
}

const SORTABLE_COLUMNS: { field: SortBy; title: string }[] = [
  { field: 'userName', title: 'User Name' },
  { field: 'email', title: 'E-mail' },
  { field: 'date', title: 'Дата' },
];

export function CommentsTable({
  comments,
  sortBy,
  descending,
  onSort,
  renderReplies,
  onReplyCreated,
}: CommentsTableProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [replyTo, setReplyTo] = useState<number | null>(null);          // под какой строкой открыта форма
  const [branchVersions, setBranchVersions] = useState<Record<number, number>>({});

  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleReplyCreated = (id: number) => {
    setReplyTo(null);
    setExpanded((prev) => new Set(prev).add(id));                          // раскрываем ветку
    setBranchVersions((v) => ({ ...v, [id]: (v[id] ?? 0) + 1 }));          // и перезагружаем её
    onReplyCreated();
  };

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
              <td>
                {/* Текст уже очищен сервером по белому списку тегов */}
                <div className={styles.text} dangerouslySetInnerHTML={{ __html: c.text }} />
                <AttachmentList attachments={c.attachments} />
              </td>
              <td className={styles.nowrap}>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.linkButton}
                    onClick={() => setReplyTo((current) => (current === c.id ? null : c.id))}
                  >
                    {replyTo === c.id ? 'Отменить ответ' : 'Ответить'}
                  </button>
                  {c.repliesCount > 0 && (
                    <RepliesToggle count={c.repliesCount} open={expanded.has(c.id)} onToggle={() => toggle(c.id)} />
                  )}
                </div>
              </td>
            </tr>

            {replyTo === c.id && (
              <tr className={styles.expandedRow}>
                <td colSpan={5}>
                  <div className={styles.replyTitle}>Ответ для {c.userName}</div>
                  <AddCommentForm
                    parentId={c.id}
                    onCreated={() => handleReplyCreated(c.id)}
                    onCancel={() => setReplyTo(null)}
                  />
                </td>
              </tr>
            )}

            {expanded.has(c.id) && (
              <tr className={styles.expandedRow}>
                <td colSpan={5}>{renderReplies(c, branchVersions[c.id] ?? 0)}</td>
              </tr>
            )}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}
