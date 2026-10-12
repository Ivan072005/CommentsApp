import { http } from '../../../shared/api/http';

// POST /api/Comments (multipart/form-data — потому что может быть файл)
export function createComment(formData: FormData): Promise<{ id: number }> {
  return http<{ id: number }>('/api/Comments', { method: 'POST', body: formData });
}
