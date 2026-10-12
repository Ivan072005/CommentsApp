import { useState } from 'react';
import { CommentCard, RepliesToggle, useReplies, type Comment } from '../../../entities/comment';
import { AddCommentForm } from '../../../features/add-comment';
import styles from './RepliesBranch.module.css';

interface RepliesBranchProps {
  parentId: number;
  reloadKey?: number; // увеличивается — ветка перезагружается
}

// Ветка ответов: грузит ответы на parentId и рисует их.
// Каждый ответ может раскрыть СВОЮ ветку — компонент вызывает сам себя (рекурсия).
export function RepliesBranch({ parentId, reloadKey = 0 }: RepliesBranchProps) {
  const { replies, loading, error } = useReplies(parentId, reloadKey);

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
  const [open, setOpen] = useState(false);         // раскрыты ли ответы на этот комментарий
  const [replying, setReplying] = useState(false); // открыта ли форма ответа
  const [added, setAdded] = useState(0);           // сколько ответов добавили прямо сейчас

  const repliesCount = comment.repliesCount + added;

  const handleCreated = () => {
    setReplying(false);
    setAdded((n) => n + 1); // счётчик +1 и перезагрузка ветки (reloadKey)
    setOpen(true);          // сразу показываем ветку с новым ответом
  };

  return (
    <CommentCard
      comment={comment}
      footer={
        <>
          <div className={styles.actions}>
            <button type="button" className={styles.linkButton} onClick={() => setReplying((r) => !r)}>
              {replying ? 'Отменить ответ' : 'Ответить'}
            </button>
            {repliesCount > 0 && (
              <RepliesToggle count={repliesCount} open={open} onToggle={() => setOpen((o) => !o)} />
            )}
          </div>

          {replying && (
            <div className={styles.replyForm}>
              <div className={styles.replyTitle}>Ответ для {comment.userName}</div>
              <AddCommentForm
                parentId={comment.id}
                onCreated={handleCreated}
                onCancel={() => setReplying(false)}
              />
            </div>
          )}

          {open && <RepliesBranch parentId={comment.id} reloadKey={added} />}
        </>
      }
    />
  );
}
