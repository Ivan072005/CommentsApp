import { ArrowLeftIcon, ArrowRightIcon } from './icons';
import styles from './Pagination.module.css';

interface PaginationProps {
  page: number;
  hasNext: boolean;
  onChange: (page: number) => void;
}

export function Pagination({ page, hasNext, onChange }: PaginationProps) {
  // одна страница и следующей нет — пагинация не нужна
  if (page === 1 && !hasNext) return null;

  return (
    <nav className={styles.nav} aria-label="Страницы">
      <button type="button" className={styles.button} disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ArrowLeftIcon /> Назад
      </button>
      <span className={styles.page}>Страница {page}</span>
      <button type="button" className={styles.button} disabled={!hasNext} onClick={() => onChange(page + 1)}>
        Вперёд <ArrowRightIcon />
      </button>
    </nav>
  );
}
