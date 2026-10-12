// Запоминаем имя/email/сайт автора в браузере, чтобы не вводить заново.
// localStorage может быть недоступен (приватный режим) — поэтому try/catch.
const STORAGE_KEY = 'comments.author';

export interface StoredAuthor {
  userName: string;
  email: string;
  homePage: string;
}

export function loadAuthor(): StoredAuthor | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<StoredAuthor>;
    return {
      userName: data.userName ?? '',
      email: data.email ?? '',
      homePage: data.homePage ?? '',
    };
  } catch {
    return null;
  }
}

export function saveAuthor(author: StoredAuthor): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(author));
  } catch {
    // не критично — просто не запомним
  }
}
