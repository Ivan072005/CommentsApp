import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './ActionButton.module.css';

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  active?: boolean;
}

// Маленькая кнопка-"таблетка" для действий: "Ответить", "Показать ответы"
export function ActionButton({ icon, active, children, className, ...rest }: ActionButtonProps) {
  const classes = [styles.button, active ? styles.active : '', className ?? ''].filter(Boolean).join(' ');

  return (
    <button type="button" className={classes} {...rest}>
      {icon}
      <span>{children}</span>
    </button>
  );
}
