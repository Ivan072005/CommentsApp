import { useSyncExternalStore } from 'react';
import { getRealtimeStatus, subscribeRealtimeStatus } from './realtime';

// Текущее состояние WebSocket-подключения: 'connecting' | 'online' | 'offline'
export function useRealtimeStatus() {
  return useSyncExternalStore(subscribeRealtimeStatus, getRealtimeStatus);
}
