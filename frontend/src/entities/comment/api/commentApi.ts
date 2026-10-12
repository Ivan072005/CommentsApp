import { http } from '../../../shared/api/http';
import { graphql } from '../../../shared/api/graphql';
import type { Comment, CommentsQuery } from '../model/types';

// REST: заглавные комментарии (сортировка + пагинация)
export function getComments(query: CommentsQuery): Promise<Comment[]> {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
    sortBy: query.sortBy,
    descending: String(query.descending),
  });
  return http<Comment[]>(`/api/Comments?${params}`);
}

// Поля комментария, которые просим у GraphQL (те же, что в REST)
const COMMENT_FIELDS = `
  id parentId userName email homePage text createdAt repliesCount
  attachments { id fileName url contentType kind sizeBytes }
`;

// GraphQL: прямые ответы на комментарий
export async function getReplies(parentId: number): Promise<Comment[]> {
  const data = await graphql<{ replies: Comment[] }>(
    `query Replies($parentId: Int!) {
       replies(parentId: $parentId) { ${COMMENT_FIELDS} }
     }`,
    { parentId },
  );
  return data.replies;
}
