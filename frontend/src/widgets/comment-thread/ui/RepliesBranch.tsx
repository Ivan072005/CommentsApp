import { useState } from 'react';
import {
  CommentCard,
  RepliesToggle,
  useCommentCreated,
  useReplies,
  type Comment,
} from '../../../entities/comment';
import { AddCommentForm } from '../../../features/add-comment';
import { ActionButton } from '../../../shared/ui/ActionButton';
import { ReplyIcon } from '../../../shared/ui/icons';
import styles from './RepliesBranch.module.css';

const HIGHLIGHT_MS = 3000;

interface RepliesBranchProps {
  parentId: number;
  reloadKey?: number; // увеличивается — ветка перезагружается
}

// Ветка ответов: грузит ответы на parentId и рисует их.
// Каждый ответ может раскрыть СВОЮ ветку — компонент вызывает сам себя (рекурсия).
export function RepliesBranch({ parentId, reloadKey = 0 }: RepliesBranchProps) {
  const [liveKey, setLiveKey] = useState(0);
  const [freshIds, setFreshIds] = useState<Set<number>>(() => new Set());

  // Кто-то (в любой вкладке) ответил в эту ветку — перезагружаем её и подсвечиваем новый ответ
  useCommentCreated((comment) => {
    if (comment.parentId !== parentId) return;
    setLiveKey((k) => k + 1);
    setFreshIds((prev) => new Set(prev).add(comment.id));
    setTimeout(() => {
      setFreshIds((prev) => {
        const next = new Set(prev);
        next.delete(comment.id);
        return next;
      });
    }, HIGHLIGHT_MS);
  });

  const { replies, loading, error } = useReplies(parentId, reloadKey + liveKey);

  if (loading) return <div className={styles.status}>Загрузка ответов…</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.branch}>
      {replies.map((reply) => (
        <ReplyItem key={reply.id} comment={reply} highlight={freshIds.has(reply.id)} />
      ))}
    </div>
  );
}

function ReplyItem({ comment, highlight }: { comment: Comment; highlight: boolean }) {
  const [open, setOpen] = useState(false);         // раскрыты ли ответы на этот комментарий
  const [replying, setReplying] = useState(false); // открыта ли форма ответа

  // id новых ответов на этот комментарий, появившихся после загрузки (свои + чужие по WebSocket).
  // Set — чтобы свой ответ, пришедший ещё и по WebSocket, не посчитать дважды.
  const [newReplyIds, setNewReplyIds] = useState<Set<number>>(() => new Set());
  const [initialCount] = useState(comment.repliesCount);

  const addReply = (id: number) =>
    setNewReplyIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));

  useCommentCreated((created) => {
    if (created.parentId === comment.id) addReply(created.id);
  });

  // Если ветка-родитель перезагрузилась, сервер уже учёл новые ответы — берём большее
  const repliesCount = Math.max(comment.repliesCount, initialCount + newReplyIds.size);

  const handleCreated = (id: number) => {
    setReplying(false);
    addReply(id);  // счётчик +1 сразу, не дожидаясь WebSocket
    setOpen(true); // и показываем ветку с новым ответом
  };

  return (
    <CommentCard
      comment={comment}
      highlight={highlight}
      footer={
        <>
          <div className={styles.actions}>
            <ActionButton icon={<ReplyIcon />} active={replying} onClick={() => setReplying((r) => !r)}>
              {replying ? 'Отменить' : 'Ответить'}
            </ActionButton>
            {repliesCount > 0 && (
              <RepliesToggle count={repliesCount} open={open} onToggle={() => setOpen((o) => !o)} />
            )}
          </div>

          {replying && (
            <div className={styles.replyForm}>
              <AddCommentForm
                title={`Ответ для ${comment.userName}`}
                parentId={comment.id}
                onCreated={handleCreated}
                onCancel={() => setReplying(false)}
              />
            </div>
          )}

          {open && <RepliesBranch parentId={comment.id} reloadKey={newReplyIds.size} />}
        </>
      }
    />
  );
}
