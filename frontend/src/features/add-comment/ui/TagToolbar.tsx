import type { RefObject } from 'react';
import styles from './AddCommentForm.module.css';

type Tag = 'i' | 'strong' | 'code' | 'a';

interface TagToolbarProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
}

const BUTTONS: { tag: Tag; label: string; title: string }[] = [
  { tag: 'i', label: '[i]', title: 'Курсив' },
  { tag: 'strong', label: '[strong]', title: 'Жирный' },
  { tag: 'code', label: '[code]', title: 'Код' },
  { tag: 'a', label: '[a]', title: 'Ссылка' },
];

const LINK_PLACEHOLDER = 'https://';

// Панель тегов: оборачивает выделенный текст в тег.
// Если ничего не выделено — вставляет пустую пару тегов и ставит курсор внутрь.
export function TagToolbar({ textareaRef, onChange }: TagToolbarProps) {
  const wrap = (tag: Tag) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart: start, selectionEnd: end, value } = textarea;
    // Пустая ссылка в браузере не видна — если для [a] ничего не выделено, подставляем текст "ссылка"
    const selected = value.slice(start, end) || (tag === 'a' ? 'ссылка' : '');
    const open = tag === 'a' ? `<a href="${LINK_PLACEHOLDER}" title="">` : `<${tag}>`;
    const close = `</${tag}>`;

    onChange(value.slice(0, start) + open + selected + close + value.slice(end));

    // После обновления React возвращаем фокус и ставим курсор в удобное место
    requestAnimationFrame(() => {
      textarea.focus();
      if (tag === 'a') {
        // выделяем "https://" — пользователь сразу вписывает адрес
        const hrefStart = start + '<a href="'.length;
        textarea.setSelectionRange(hrefStart, hrefStart + LINK_PLACEHOLDER.length);
      } else {
        const innerStart = start + open.length;
        textarea.setSelectionRange(innerStart, innerStart + selected.length);
      }
    });
  };

  return (
    <div className={styles.toolbar}>
      {BUTTONS.map((b) => (
        <button key={b.tag} type="button" className={styles.toolButton} title={b.title} onClick={() => wrap(b.tag)}>
          {b.label}
        </button>
      ))}
    </div>
  );
}
