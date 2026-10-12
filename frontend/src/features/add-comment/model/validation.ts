import { ApiError } from '../../../shared/api/http';
import { checkTags } from './htmlTags';

export interface FormValues {
  userName: string;
  email: string;
  homePage: string;
  text: string;
  captchaCode: string;
}

export type FieldName = keyof FormValues | 'file';
export type FieldErrors = Partial<Record<FieldName, string>>;

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif'];
const MAX_TXT_BYTES = 100 * 1024;

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const extensionOf = (fileName: string) => {
  const dot = fileName.lastIndexOf('.');
  return dot >= 0 ? fileName.slice(dot).toLowerCase() : '';
};

export function validateFile(file: File | null): string | null {
  if (!file) return null;

  const ext = extensionOf(file.name);
  if (ext === '.txt') {
    return file.size > MAX_TXT_BYTES ? 'TXT-файл не должен превышать 100 КБ' : null;
  }
  if (!IMAGE_EXTENSIONS.includes(ext)) {
    return 'Разрешены только изображения JPG, GIF, PNG или файл TXT';
  }
  return null;
}

// Клиентская валидация — те же правила, что и на сервере (FluentValidation)
export function validate(values: FormValues, file: File | null): FieldErrors {
  const errors: FieldErrors = {};
  const userName = values.userName.trim();
  const email = values.email.trim();
  const homePage = values.homePage.trim();

  if (!userName) errors.userName = 'Имя пользователя обязательно';
  else if (!/^[a-zA-Z0-9]+$/.test(userName)) errors.userName = 'Только латинские буквы и цифры';
  else if (userName.length > 50) errors.userName = 'Не длиннее 50 символов';

  if (!email) errors.email = 'Email обязателен';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Некорректный формат email';
  else if (email.length > 255) errors.email = 'Не длиннее 255 символов';

  if (homePage && !isHttpUrl(homePage)) errors.homePage = 'Адрес должен начинаться с http:// или https://';

  if (!values.text.trim()) errors.text = 'Текст комментария обязателен';
  else {
    const tagsError = checkTags(values.text);
    if (tagsError) errors.text = tagsError;
  }

  if (!values.captchaCode.trim()) errors.captchaCode = 'Введите код с картинки';

  const fileError = validateFile(file);
  if (fileError) errors.file = fileError;

  return errors;
}

// Сервер отвечает 400 { Errors: [{ Field: "UserName", Message: "..." }] } — раскладываем по полям формы
const SERVER_FIELD_MAP: Record<string, FieldName> = {
  UserName: 'userName',
  Email: 'email',
  HomePage: 'homePage',
  Text: 'text',
  CaptchaId: 'captchaCode',
  CaptchaCode: 'captchaCode',
  File: 'file',
};

interface ServerValidationBody {
  Errors?: { Field: string; Message: string }[];
  Error?: string;
}

export function parseServerError(error: unknown): { fields: FieldErrors; general: string | null } {
  if (!(error instanceof ApiError)) {
    return { fields: {}, general: 'Сервер недоступен. Попробуйте позже.' };
  }

  const body = (error.body ?? {}) as ServerValidationBody;
  const fields: FieldErrors = {};
  const generalMessages: string[] = [];

  for (const item of body.Errors ?? []) {
    const field = SERVER_FIELD_MAP[item.Field];
    if (field) fields[field] = item.Message;
    else generalMessages.push(item.Message);
  }

  if (body.Error) generalMessages.push(body.Error);
  if (generalMessages.length === 0 && Object.keys(fields).length === 0) {
    generalMessages.push(`Ошибка сервера (${error.status})`);
  }

  return { fields, general: generalMessages.length > 0 ? generalMessages.join('. ') : null };
}
