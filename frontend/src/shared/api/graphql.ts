import { API_URL } from '../config';
import { ApiError } from './http';

interface GraphQLResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

// GraphQL — это всегда POST на /graphql с { query, variables }
export async function graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${API_URL}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  const body = (await response.json().catch(() => null)) as GraphQLResponse<T> | null;

  // GraphQL может вернуть 200, но с errors — это тоже ошибка
  if (!response.ok || !body || body.errors?.length || !body.data) {
    throw new ApiError(response.status, body);
  }
  return body.data;
}
