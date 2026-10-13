import { useRealtimeStatus } from '../../../shared/api/useRealtimeStatus';
import { ChatIcon } from '../../../shared/ui/icons';
import styles from './AppHeader.module.css';

const STATUS_LABEL = {
  online: 'Live',
  connecting: 'Подключение…',
  offline: 'Офлайн',
} as const;

export function AppHeader() {
  const status = useRealtimeStatus();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <span className={styles.logo}>
            <ChatIcon size={20} />
          </span>
          <div className={styles.title}>Комментарии</div>
        </div>

        {/* Индикатор WebSocket: зелёная пульсирующая точка, когда новые комментарии приходят мгновенно */}
        <span className={`${styles.status} ${styles[status]}`} title="Состояние подключения в реальном времени">
          <span className={styles.dot} />
          {STATUS_LABEL[status]}
        </span>
      </div>
    </header>
  );
}
