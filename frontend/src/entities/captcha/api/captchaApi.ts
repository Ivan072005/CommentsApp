import { http } from '../../../shared/api/http';
import type { Captcha } from '../model/types';

export function getCaptcha(): Promise<Captcha> {
  return http<Captcha>('/api/Captcha');
}
