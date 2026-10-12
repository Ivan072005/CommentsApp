// "2026-10-11T08:31:01Z" -> "11.10.2026, 11:31" (в часовом поясе пользователя)
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}