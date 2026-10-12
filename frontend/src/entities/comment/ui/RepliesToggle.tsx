interface RepliesToggleProps {
  count: number;
  open: boolean;
  onToggle: () => void;
}

// Кнопка "Показать ответы (N)" / "Скрыть ответы"
export function RepliesToggle({ count, open, onToggle }: RepliesToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        color: '#7aa2ff',
        cursor: 'pointer',
        font: 'inherit',
        fontSize: 13,
      }}
    >
      {open ? 'Скрыть ответы' : `Показать ответы (${count})`}
    </button>
  );
}
