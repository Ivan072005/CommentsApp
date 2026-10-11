import { http } from '../../../shared/api/http';
import type { Comment, CommentsQuery } from '../model/types';

export function getComments(query: CommentsQuery): Promise<Comment[]> {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
    sortBy: query.sortBy,
    descending: String(query.descending),
  });
  return http<Comment[]>(`/api/Comments?${params}`);
}