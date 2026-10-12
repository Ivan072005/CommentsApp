import type { ReactNode } from 'react';
import type { Comment } from '../model/types';
import { formatDate } from '../../../shared/lib/formatDate';
import { isSafeUrl } from '../../../shared/lib/isSafeUrl';
import { fileUrl } from '../../../shared/api/http';
import styles from './CommentCard.module.css';

interface CommentCardProps {
  comment: Comment;
  footer?: ReactNode; // место для кнопок/вложенных ответов
}

export function CommentCard({ comment, footer }: CommentCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <b>
          {comment.homePage && isSafeUrl(comment.homePage) ? (
            <a href={comment.homePage} target="_blank" rel="noopener noreferrer nofollow">
              {comment.userName}
            </a>
          ) : (
            comment.userName
          )}
        </b>
        <span className={styles.muted}>{comment.email}</span>
        <span className={styles.muted}>{formatDate(comment.createdAt)}</span>
      </div>

      {/* Текст уже очищен сервером по белому списку тегов */}
      <div className={styles.text} dangerouslySetInnerHTML={{ __html: comment.text }} />

      {comment.attachments.length > 0 && (
        <div className={styles.attachments}>
          {comment.attachments.map((a) =>
            a.kind === 'image' ? (
              <img key={a.id} src={fileUrl(a.url)} alt={a.fileName} className={styles.thumb} />
            ) : (
              <a key={a.id} href={fileUrl(a.url)} target="_blank" rel="noopener noreferrer">
                TXT: {a.fileName}
              </a>
            ),
          )}
        </div>
      )}

      {footer}
    </div>
  );
}
