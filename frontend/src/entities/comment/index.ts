export type { Attachment, Comment, CommentsQuery, SortBy } from './model/types';
export { getComments } from './api/commentApi';
export { useTopComments, PAGE_SIZE } from './model/useTopComments';