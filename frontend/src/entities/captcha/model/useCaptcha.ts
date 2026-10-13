import { useEffect, useState } from 'react';
import { getCaptcha } from '../api/captchaApi';
import type { Captcha } from './types';

// Капча одноразовая: после каждой отправки формы её нужно обновить (refresh)
export function useCaptcha() {
  const [captcha, setCaptcha] = useState<Captcha | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    getCaptcha()
      .then((data) => {
        if (!cancelled) {
          setCaptcha(data);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Не удалось загрузить капчу');
      });

    return () => { cancelled = true; };
  }, [version]);

  return {
    captcha,
    error,
    refresh: () => setVersion((v) => v + 1),
  };
}
