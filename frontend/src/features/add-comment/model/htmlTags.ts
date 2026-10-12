// Правила разрешённых тегов — те же, что в серверном CommentSanitizer.
// Используются для проверки перед отправкой и для безопасного предпросмотра.

const ALLOWED_TAGS: Record<string, string[]> = {
  a: ['href', 'title'],
  code: [],
  i: [],
  strong: [],
};

// Тот же регэксп тегов, что и на сервере
const TAG_REGEX = /<\/?([a-zA-Z0-9]+)((?:\s+[a-zA-Z0-9-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'))?)*)\s*\/?>/g;
const ATTR_REGEX = /([a-zA-Z0-9-]+)\s*=\s*"([^"]*)"/g;

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

// Проверка "валидного XHTML": каждый разрешённый тег открыт и закрыт в правильном порядке
export function checkTags(text: string): string | null {
  const stack: string[] = [];

  for (const match of text.matchAll(TAG_REGEX)) {
    const name = match[1].toLowerCase();
    const full = match[0];

    if (!(name in ALLOWED_TAGS) || full.endsWith('/>')) continue;

    if (full.startsWith('</')) {
      if (stack.at(-1) !== name) return `Тег <${name}> закрыт некорректно или без открытия`;
      stack.pop();
    } else {
      stack.push(name);
    }
  }

  return stack.length > 0 ? `Не закрыт тег: <${stack.at(-1)}>` : null;
}

// Безопасный HTML для предпросмотра: весь текст экранируется,
// разрешённые теги пересобираются только с разрешёнными атрибутами (href — только http/https).
export function sanitizeForPreview(text: string): string {
  let result = '';
  let lastIndex = 0;

  for (const match of text.matchAll(TAG_REGEX)) {
    const index = match.index ?? 0;
    result += escapeHtml(text.slice(lastIndex, index));
    result += processTag(match);
    lastIndex = index + match[0].length;
  }

  return result + escapeHtml(text.slice(lastIndex));
}

function processTag(match: RegExpMatchArray): string {
  const name = match[1].toLowerCase();
  const full = match[0];
  const allowedAttrs = ALLOWED_TAGS[name];

  if (!allowedAttrs) return escapeHtml(full); // чужой тег — показываем как текст
  if (full.startsWith('</')) return `</${name}>`;

  const attrs: string[] = [];
  for (const attr of (match[2] ?? '').matchAll(ATTR_REGEX)) {
    const attrName = attr[1].toLowerCase();
    const attrValue = attr[2];
    if (!allowedAttrs.includes(attrName)) continue;
    if (attrName === 'href' && !isHttpUrl(attrValue)) continue;
    attrs.push(`${attrName}="${escapeHtml(attrValue)}"`);
  }

  return attrs.length > 0 ? `<${name} ${attrs.join(' ')}>` : `<${name}>`;
}
