import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
  type HubConnection,
} from '@microsoft/signalr';
import { API_URL } from '../config';

// Одно WebSocket-подключение к SignalR-хабу на всё приложение.
// Подключаемся лениво — при первой подписке; при обрыве переподключаемся сами.
const HUB_URL = `${API_URL}/hubs/comments`;
const RETRY_DELAY_MS = 5000;

export type RealtimeStatus = 'connecting' | 'online' | 'offline';

let connection: HubConnection | null = null;
let starting = false;
let status: RealtimeStatus = 'connecting';
const statusListeners = new Set<() => void>();

function setStatus(next: RealtimeStatus): void {
  if (status === next) return;
  status = next;
  statusListeners.forEach((listener) => listener());
}

function getConnection(): HubConnection {
  if (!connection) {
    connection = new HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect() // короткие обрывы связи — переподключится сам
      .configureLogging(LogLevel.Warning)
      .build();

    connection.onreconnecting(() => setStatus('connecting'));
    connection.onreconnected(() => setStatus('online'));
    // Если автопереподключение сдалось (сервер долго лежал) — пробуем снова через паузу
    connection.onclose(() => {
      setStatus('offline');
      setTimeout(start, RETRY_DELAY_MS);
    });
  }
  return connection;
}

function start(): void {
  const conn = getConnection();
  if (starting || conn.state !== HubConnectionState.Disconnected) return;

  starting = true;
  setStatus('connecting');
  conn
    .start()
    .then(() => setStatus('online'))
    .catch((error) => {
      console.warn('SignalR: не удалось подключиться, повтор через 5 с', error);
      setStatus('offline');
      setTimeout(start, RETRY_DELAY_MS); // API ещё не запущен — пробуем позже
    })
    .finally(() => {
      starting = false;
    });
}

// Подписаться на событие сервера. Возвращает функцию отписки.
export function subscribe<T>(eventName: string, listener: (payload: T) => void): () => void {
  const conn = getConnection();
  conn.on(eventName, listener);
  start();
  return () => conn.off(eventName, listener);
}

// Для индикатора "Live" в шапке (используется через useSyncExternalStore)
export function getRealtimeStatus(): RealtimeStatus {
  return status;
}

export function subscribeRealtimeStatus(listener: () => void): () => void {
  statusListeners.add(listener);
  start();
  return () => {
    statusListeners.delete(listener);
  };
}
