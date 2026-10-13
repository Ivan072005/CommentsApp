export interface Attachment {
  id: number;
  fileName: string;
  url: string;
  contentType: string;
  kind: 'image' | 'text';
  sizeBytes: number;
}

export interface Comment {
  id: number;
  parentId: number | null;
  userName: string;
  email: string;
  homePage: string | null;
  text: string;        // HTML, уже очищенный сервером (белый список тегов)
  createdAt: string;   // UTC, ISO-строка с "Z"
  repliesCount: number;
  attachments: Attachment[];
}

export type SortBy = 'date' | 'userName' | 'email';

export interface CommentsQuery {
  page: number;
  pageSize: number;
  sortBy: SortBy;
  descending: boolean;
}