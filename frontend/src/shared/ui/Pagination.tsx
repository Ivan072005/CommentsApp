interface PaginationProps {
  page: number;
  hasNext: boolean;
  onChange: (page: number) => void;
}

export function Pagination({ page, hasNext, onChange }: PaginationProps) {
  return (
    <nav style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', marginTop: 16 }}>
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ← Назад
      </button>
      <span>Страница {page}</span>
      <button type="button" disabled={!hasNext} onClick={() => onChange(page + 1)}>
        Вперёд →
      </button>
    </nav>
  );
}