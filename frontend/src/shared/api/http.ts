import { API_URL } from '../config';

// Ошибка API: статус + тело ответа (например, { Errors: [{ Field, Message }] })
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(`API error ${status}`);
    this.status = status;
    this.body = body;
  }
}

// Общий "официант" для всех запросов к бэкенду
export async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, init);
  const body = await response.json().catch(() => null);

  if (!response.ok) throw new ApiError(response.status, body);
  return body as T;
}

// "/uploads/abc.png" -> "https://localhost:7066/uploads/abc.png"
export const fileUrl = (relativeUrl: string) => `${API_URL}${relativeUrl}`;