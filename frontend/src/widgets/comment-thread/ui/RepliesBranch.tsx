import { useState } from 'react';
import { CommentCard, RepliesToggle, useReplies, type Comment } from '../../../entities/comment';
import styles from './RepliesBranch.module.css';

// Ветка ответов: грузит ответы на parentId и рисует их.
// Каждый ответ может раскрыть СВОЮ ветку — компонент вызывает сам себя (рекурсия).
export function RepliesBranch({ parentId }: { parentId: number }) {
  const { replies, loading, error } = useReplies(parentId);

  if (loading) return <div className={styles.status}>Загрузка ответов…</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.branch}>
      {replies.map((reply) => (
        <ReplyItem key={reply.id} comment={reply} />
      ))}
    </div>
  );
}

function ReplyItem({ comment }: { comment: Comment }) {
  const [open, setOpen] = useState(false);

  return (
    <CommentCard
      comment={comment}
      footer={
        comment.repliesCount > 0 && (
          <>
            <RepliesToggle count={comment.repliesCount} open={open} onToggle={() => setOpen((o) => !o)} />
            {open && <RepliesBranch parentId={comment.id} />}
          </>
        )
      }
    />
  );
}
