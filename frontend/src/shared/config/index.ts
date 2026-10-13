// Адрес API. В разработке — https://localhost:7066 (из .env.development).
// В Docker пустой: фронт и API на одном адресе, запросы проксирует nginx.
export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '';
