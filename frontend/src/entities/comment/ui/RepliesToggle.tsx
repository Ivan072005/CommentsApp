import { ActionButton } from '../../../shared/ui/ActionButton';
import { ChevronIcon } from '../../../shared/ui/icons';

interface RepliesToggleProps {
  count: number;
  open: boolean;
  onToggle: () => void;
}

// Кнопка "Ответы (N)" — стрелка поворачивается, когда ветка раскрыта
export function RepliesToggle({ count, open, onToggle }: RepliesToggleProps) {
  return (
    <ActionButton icon={<ChevronIcon />} active={open} onClick={onToggle} aria-expanded={open}>
      {open ? 'Скрыть ответы' : `Ответы (${count})`}
    </ActionButton>
  );
}
