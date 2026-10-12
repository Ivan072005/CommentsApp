import { Fragment, useState, type ReactNode } from 'react';
import { AttachmentList, RepliesToggle, type Comment, type SortBy } from '../../../entities/comment';
import { AddCommentForm } from '../../../features/add-comment';
import { formatDate } from '../../../shared/lib/formatDate';
import { isSafeUrl } from '../../../shared/lib/isSafeUrl';
import { ActionButton } from '../../../shared/ui/ActionButton';
import { Avatar } from '../../../shared/ui/Avatar';
import { ReplyIcon } from '../../../shared/ui/icons';
import styles from './CommentsTable.module.css';

interface CommentsTableProps {
  comments: Comment[];
  sortBy: SortBy;
  descending: boolean;
  onSort: (field: SortBy) => void;
  // что показать под раскрытой строкой; reloadKey растёт после нового ответа
  renderReplies: (comment: Comment, reloadKey: number) => ReactNode;
  onReplyCreated: () => void;  // обновить список (чтобы пересчитался счётчик ответов)
  freshIds?: Set<number>;      // только что появившиеся комментарии — подсветить
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
  freshIds,
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
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {SORTABLE_COLUMNS.map((col) => {
              const active = sortBy === col.field;
              return (
                <th key={col.field} aria-sort={active ? (descending ? 'descending' : 'ascending') : 'none'}>
                  <button
                    type="button"
                    className={active ? `${styles.sortButton} ${styles.sortActive}` : styles.sortButton}
                    onClick={() => onSort(col.field)}
                  >
                    {col.title}
                    <span className={styles.sortIcon} aria-hidden="true">
                      {active ? (descending ? '↓' : '↑') : '↕'}
                    </span>
                  </button>
                </th>
              );
            })}
            <th>Комментарий</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {comments.length === 0 && (
            <tr>
              <td colSpan={5} className={styles.empty}>
                Комментариев пока нет — станьте первым!
              </td>
            </tr>
          )}

          {comments.map((c) => (
            <Fragment key={c.id}>
              <tr className={freshIds?.has(c.id) ? styles.fresh : undefined}>
                <td>
                  <div className={styles.user}>
                    <Avatar name={c.userName} size={30} />
                    {c.homePage && isSafeUrl(c.homePage) ? (
                      <a href={c.homePage} target="_blank" rel="noopener noreferrer nofollow">{c.userName}</a>
                    ) : (
                      <span>{c.userName}</span>
                    )}
                  </div>
                </td>
                <td className={styles.muted}>{c.email}</td>
                <td className={`${styles.muted} ${styles.nowrap}`}>
                  <time dateTime={c.createdAt}>{formatDate(c.createdAt)}</time>
                </td>
                <td className={styles.comment}>
                  {/* Текст уже очищен сервером по белому списку тегов */}
                  <div className={styles.text} dangerouslySetInnerHTML={{ __html: c.text }} />
                  <AttachmentList attachments={c.attachments} />
                </td>
                <td>
                  <div className={styles.actions}>
                    <ActionButton
                      icon={<ReplyIcon />}
                      active={replyTo === c.id}
                      onClick={() => setReplyTo((current) => (current === c.id ? null : c.id))}
                    >
                      {replyTo === c.id ? 'Отменить' : 'Ответить'}
                    </ActionButton>
                    {c.repliesCount > 0 && (
                      <RepliesToggle count={c.repliesCount} open={expanded.has(c.id)} onToggle={() => toggle(c.id)} />
                    )}
                  </div>
                </td>
              </tr>

              {replyTo === c.id && (
                <tr className={styles.expandedRow}>
                  <td colSpan={5}>
                    <AddCommentForm
                      title={`Ответ для ${c.userName}`}
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
    </div>
  );
}
