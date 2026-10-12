import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from './Lightbox.module.css';

interface LightboxProps {
  title?: string;
  onClose: () => void;
  children: ReactNode;
}

// Модальное окно поверх страницы: закрывается по Esc, клику на фон или крестику.
// createPortal рисует окно прямо в <body>, чтобы его не обрезали таблица и её ячейки.
export function Lightbox({ title, onClose, children }: LightboxProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    // пока окно открыто — страница под ним не прокручивается
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      {/* клик внутри окна не должен закрывать его */}
      <div className={styles.window} onClick={(event) => event.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>{title}</span>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
