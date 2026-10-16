import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useCaptcha } from '../../../entities/captcha';
import { CommentCard } from '../../../entities/comment';
import { createComment } from '../api/createComment';
import { loadAuthor, saveAuthor } from '../model/authorStorage';
import { sanitizeForPreview } from '../model/htmlTags';
import {
  parseServerError,
  validate,
  validateFile,
  type FieldErrors,
  type FieldName,
  type FormValues,
} from '../model/validation';
import { CheckIcon, FileIcon, RefreshIcon } from '../../../shared/ui/icons';
import { Lightbox } from '../../../shared/ui/Lightbox';
import { TagToolbar } from './TagToolbar';
import styles from './AddCommentForm.module.css';

interface AddCommentFormProps {
  title?: string;           // заголовок над формой
  parentId?: number;        // если задан — это ответ на комментарий
  onCreated: (commentId: number) => void; // вызвать после успешной отправки (обновить список)
  onCancel?: () => void;    // кнопка "Отмена" (для формы ответа)
}

const emptyValues = (): FormValues => {
  const author = loadAuthor();
  return {
    userName: author?.userName ?? '',
    email: author?.email ?? '',
    homePage: author?.homePage ?? '',
    text: '',
    captchaCode: '',
  };
};

export function AddCommentForm({ title, parentId, onCreated, onCancel }: AddCommentFormProps) {
  // Уникальные id: на странице может быть несколько форм (ответы), id не должны совпадать
  const uid = useId();
  const fieldId = (name: string) => `${uid}-${name}`;
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Превью выбранной картинки: временная ссылка на файл с компьютера (blob:), на сервер ничего не уходит
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [filePreviewOpen, setFilePreviewOpen] = useState(false);
  const filePreviewRef = useRef<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [previewDate, setPreviewDate] = useState<string | null>(null); // null = предпросмотр скрыт
  const { captcha, error: captchaError, refresh: refreshCaptcha } = useCaptcha();

  const setField = (name: keyof FormValues, value: string) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => ({ ...e, [name]: undefined })); // ошибка поля пропадает, как только начали исправлять
    setSuccess(false);
  };

  // Старую ссылку освобождаем (revokeObjectURL), иначе файл так и останется в памяти браузера
  const updateFilePreview = (next: File | null) => {
    if (filePreviewRef.current) URL.revokeObjectURL(filePreviewRef.current);
    const url = next && next.type.startsWith('image/') ? URL.createObjectURL(next) : null;
    filePreviewRef.current = url;
    setFilePreviewUrl(url);
    setFilePreviewOpen(false);
  };

  // Форму закрыли (например, отменили ответ) — освобождаем ссылку
  useEffect(() => {
    const previewRef = filePreviewRef;
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  const handleFileChange = (selected: File | null) => {
    setFile(selected);
    setErrors((e) => ({ ...e, file: validateFile(selected) ?? undefined }));
    updateFilePreview(selected);
  };

  const clearFile = () => {
    setFile(null);
    setErrors((e) => ({ ...e, file: undefined }));
    updateFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Превью показываем, только если файл прошёл проверку (формат и размер)
  const showFilePreview = file !== null && filePreviewUrl !== null && !errors.file;

  const togglePreview = () =>
    setPreviewDate((d) => (d ? null : new Date().toISOString()));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setGeneralError(null);
    setSuccess(false);

    // 1. Клиентская валидация — не отправляем заведомо неверные данные
    const clientErrors = validate(values, file);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    if (!captcha) {
      setGeneralError('Капча ещё не загрузилась');
      return;
    }

    // 2. Собираем multipart/form-data (имена полей — как в CreateCommentRequest на сервере)
    const formData = new FormData();
    formData.append('UserName', values.userName.trim());
    formData.append('Email', values.email.trim());
    if (values.homePage.trim()) formData.append('HomePage', values.homePage.trim());
    formData.append('Text', values.text);
    if (parentId !== undefined) formData.append('ParentId', String(parentId));
    formData.append('CaptchaId', captcha.id);
    formData.append('CaptchaCode', values.captchaCode.trim());
    if (file) formData.append('File', file);

    setSubmitting(true);
    try {
      const created = await createComment(formData);

      saveAuthor({ userName: values.userName.trim(), email: values.email.trim(), homePage: values.homePage.trim() });
      setValues((v) => ({ ...v, text: '', captchaCode: '' }));
      clearFile();
      setPreviewDate(null);
      setSuccess(true);
      onCreated(created.id);
    } catch (error) {
      // 3. Ошибки сервера раскладываем по полям
      const parsed = parseServerError(error);
      setErrors(parsed.fields);
      setGeneralError(parsed.general);
      setValues((v) => ({ ...v, captchaCode: '' }));
    } finally {
      setSubmitting(false);
      refreshCaptcha(); // капча одноразовая — после любой отправки берём новую
    }
  };

  const inputClass = (name: FieldName, base = styles.input) =>
    errors[name] ? `${base} ${styles.invalid}` : base;

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {title && <h3 className={styles.title}>{title}</h3>}

      <div className={styles.row}>
        <Field label="User Name" htmlFor={fieldId('userName')} required error={errors.userName}>
          <input
            id={fieldId('userName')}
            className={inputClass('userName')}
            value={values.userName}
            onChange={(e) => setField('userName', e.target.value)}
            autoComplete="username"
            maxLength={50}
          />
        </Field>

        <Field label="E-mail" htmlFor={fieldId('email')} required error={errors.email}>
          <input
            id={fieldId('email')}
            className={inputClass('email')}
            type="email"
            value={values.email}
            onChange={(e) => setField('email', e.target.value)}
            autoComplete="email"
            maxLength={255}
          />
        </Field>

        <Field label="Home page" htmlFor={fieldId('homePage')} error={errors.homePage}>
          <input
            id={fieldId('homePage')}
            className={inputClass('homePage')}
            type="url"
            placeholder="https://..."
            value={values.homePage}
            onChange={(e) => setField('homePage', e.target.value)}
            autoComplete="url"
          />
        </Field>
      </div>

      <Field
        label="Текст"
        htmlFor={fieldId('text')}
        required
        error={errors.text}
      >
        <div className={styles.editorBar}>
          <TagToolbar textareaRef={textareaRef} onChange={(value) => setField('text', value)} />
          <button type="button" className={styles.linkButton} onClick={togglePreview}>
            {previewDate ? 'Скрыть предпросмотр' : 'Предпросмотр'}
          </button>
        </div>
        <textarea
          id={fieldId('text')}
          ref={textareaRef}
          className={inputClass('text', styles.textarea)}
          rows={5}
          value={values.text}
          onChange={(e) => setField('text', e.target.value)}
        />
      </Field>

      {previewDate && (
        <div className={styles.preview}>
          <div className={styles.previewTitle}>Предпросмотр (так комментарий будет выглядеть)</div>
          <CommentCard
            comment={{
              id: 0,
              parentId: parentId ?? null,
              userName: values.userName.trim() || 'Аноним',
              email: values.email.trim(),
              homePage: values.homePage.trim() || null,
              text: sanitizeForPreview(values.text),
              createdAt: previewDate,
              repliesCount: 0,
              attachments: [],
            }}
          />
        </div>
      )}

      <Field label="Файл" error={errors.file} hint="JPG, GIF, PNG (уменьшится до 320×240) или TXT до 100 КБ">
        <div className={styles.fileRow}>
          {/* Стандартный input спрятан — вместо него своя кнопка в стиле формы */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.gif,.txt"
            className={styles.hiddenInput}
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          />
          <button type="button" className={styles.fileButton} onClick={() => fileInputRef.current?.click()}>
            <FileIcon /> Выбрать файл
          </button>
          {showFilePreview && (
            <button
              type="button"
              className={styles.filePreviewButton}
              onClick={() => setFilePreviewOpen(true)}
              title="Открыть картинку"
            >
              <img src={filePreviewUrl ?? undefined} alt={file?.name} className={styles.filePreviewThumb} />
            </button>
          )}
          <span className={file ? styles.fileName : styles.hint}>{file ? file.name : 'Файл не выбран'}</span>
          {file && (
            <button type="button" className={styles.linkButton} onClick={clearFile}>
              Убрать файл
            </button>
          )}
        </div>
      </Field>

      {showFilePreview && filePreviewOpen && (
        <Lightbox title={file?.name} onClose={() => setFilePreviewOpen(false)}>
          <img src={filePreviewUrl ?? undefined} alt={file?.name} className={styles.filePreviewFull} />
        </Lightbox>
      )}

      <Field label="Код с картинки" htmlFor={fieldId('captchaCode')} required error={errors.captchaCode ?? captchaError ?? undefined}>
        <div className={styles.captcha}>
          {captcha ? (
            <img className={styles.captchaImage} src={captcha.imageDataUri} alt="CAPTCHA" />
          ) : (
            <span className={styles.hint}>Загрузка…</span>
          )}
          <button type="button" className={styles.iconButton} onClick={refreshCaptcha} title="Другая картинка">
            <RefreshIcon size={16} />
          </button>
          <input
            id={fieldId('captchaCode')}
            className={inputClass('captchaCode')}
            value={values.captchaCode}
            onChange={(e) => setField('captchaCode', e.target.value)}
            autoComplete="off"
            maxLength={10}
            style={{ width: 140 }}
          />
        </div>
      </Field>

      {generalError && <p className={styles.error}>{generalError}</p>}
      {success && (
        <p className={styles.success}>
          <CheckIcon /> Комментарий добавлен
        </p>
      )}

      <div className={styles.actions}>
        <button type="submit" className={styles.button} disabled={submitting}>
          {submitting ? 'Отправка…' : parentId !== undefined ? 'Ответить' : 'Отправить'}
        </button>
        {onCancel && (
          <button type="button" className={styles.linkButton} onClick={onCancel}>
            Отмена
          </button>
        )}
      </div>
    </form>
  );
}

interface FieldProps {
  label: string;
  /** id поля ввода: клик по подписи ставит фокус в это поле */
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}

// Обёртка — <div>, а не <label>: иначе клик по пустому месту поля
// "нажимает" первый элемент внутри (открывает выбор файла, обновляет капчу).
// Подпись связана с полем через htmlFor/id.
function Field({ label, htmlFor, required, error, hint, children }: FieldProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={htmlFor}>
        {label}
        {required && <span className={styles.required}> *</span>}
      </label>
      {children}
      {hint && !error && <span className={styles.hint}>{hint}</span>}
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
