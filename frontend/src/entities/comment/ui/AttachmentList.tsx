import { useEffect, useState } from 'react';
import type { Attachment } from '../model/types';
import { fileUrl } from '../../../shared/api/http';
import { Lightbox } from '../../../shared/ui/Lightbox';
import styles from './AttachmentList.module.css';

const formatSize = (bytes: number) =>
  bytes < 1024 ? `${bytes} Б` : `${(bytes / 1024).toFixed(1)} КБ`;

// Вложения комментария: превью картинок и кнопки TXT. По клику — lightbox.
export function AttachmentList({ attachments }: { attachments: Attachment[] }) {
  const [active, setActive] = useState<Attachment | null>(null);

  if (attachments.length === 0) return null;

  return (
    <>
      <div className={styles.list}>
        {attachments.map((a) =>
          a.kind === 'image' ? (
            <button key={a.id} type="button" className={styles.thumbButton} onClick={() => setActive(a)} title="Открыть">
              <img src={fileUrl(a.url)} alt={a.fileName} className={styles.thumb} loading="lazy" />
            </button>
          ) : (
            <button key={a.id} type="button" className={styles.fileButton} onClick={() => setActive(a)}>
              TXT: {a.fileName} ({formatSize(a.sizeBytes)})
            </button>
          ),
        )}
      </div>

      {active && (
        <Lightbox title={active.fileName} onClose={() => setActive(null)}>
          {active.kind === 'image' ? (
            <img src={fileUrl(active.url)} alt={active.fileName} className={styles.fullImage} />
          ) : (
            <TextFileView url={fileUrl(active.url)} />
          )}
        </Lightbox>
      )}
    </>
  );
}

interface TextState {
  url: string;
  text: string | null;
  error: boolean;
}

// Загружает TXT-файл и показывает его как текст.
// <pre>{text}</pre> — React экранирует содержимое, HTML внутри файла не выполнится.
function TextFileView({ url }: { url: string }) {
  const [state, setState] = useState<TextState | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .then((text) => {
        if (!cancelled) setState({ url, text, error: false });
      })
      .catch(() => {
        if (!cancelled) setState({ url, text: null, error: true });
      });

    return () => { cancelled = true; };
  }, [url]);

  const current = state?.url === url ? state : null;

  if (!current) return <p className={styles.muted}>Загрузка…</p>;
  if (current.error) return <p className={styles.error}>Не удалось загрузить файл</p>;
  return <pre className={styles.text}>{current.text}</pre>;
}
