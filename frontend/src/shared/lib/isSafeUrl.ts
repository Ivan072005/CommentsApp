// Ссылки показываем только для http/https (защита от "javascript:...")
export const isSafeUrl = (url: string) => /^https?:\/\//i.test(url);
