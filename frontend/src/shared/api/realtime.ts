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

let connection: HubConnection | null = null;
let starting = false;

function getConnection(): HubConnection {
  if (!connection) {
    connection = new HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect() // короткие обрывы связи — переподключится сам
      .configureLogging(LogLevel.Warning)
      .build();

    // Если автопереподключение сдалось (сервер долго лежал) — пробуем снова через паузу
    connection.onclose(() => setTimeout(start, RETRY_DELAY_MS));
  }
  return connection;
}

function start(): void {
  const conn = getConnection();
  if (starting || conn.state !== HubConnectionState.Disconnected) return;

  starting = true;
  conn
    .start()
    .catch((error) => {
      console.warn('SignalR: не удалось подключиться, повтор через 5 с', error);
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
