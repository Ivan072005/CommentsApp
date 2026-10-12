import type { ReactNode } from 'react';
import type { Comment } from '../model/types';
import { formatDate } from '../../../shared/lib/formatDate';
import { isSafeUrl } from '../../../shared/lib/isSafeUrl';
import { Avatar } from '../../../shared/ui/Avatar';
import { AttachmentList } from './AttachmentList';
import styles from './CommentCard.module.css';

interface CommentCardProps {
  comment: Comment;
  footer?: ReactNode;   // место для кнопок/вложенных ответов
  highlight?: boolean;  // только что пришёл — подсветить
}

export function CommentCard({ comment, footer, highlight }: CommentCardProps) {
  return (
    <article className={highlight ? `${styles.card} ${styles.fresh}` : styles.card}>
      <Avatar name={comment.userName} size={32} />

      <div className={styles.body}>
        <div className={styles.header}>
          <span className={styles.name}>
            {comment.homePage && isSafeUrl(comment.homePage) ? (
              <a href={comment.homePage} target="_blank" rel="noopener noreferrer nofollow">
                {comment.userName}
              </a>
            ) : (
              comment.userName
            )}
          </span>
          <span className={styles.muted}>{comment.email}</span>
          <span className={styles.dot} aria-hidden="true">·</span>
          <time className={styles.muted} dateTime={comment.createdAt}>
            {formatDate(comment.createdAt)}
          </time>
        </div>

        {/* Текст уже очищен сервером по белому списку тегов */}
        <div className={styles.text} dangerouslySetInnerHTML={{ __html: comment.text }} />

        <AttachmentList attachments={comment.attachments} />

        {footer}
      </div>
    </article>
  );
}
