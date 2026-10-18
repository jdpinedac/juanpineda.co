import { DEFAULT_LOCALE, LOCALES, type Locale } from './routes';
import { UI, type UIKey } from './ui';

/** Locale a partir del pathname: /en/... es inglés, el resto español. */
export function getLocale(pathname: string): Locale {
  const seg = pathname.split('/')[1];
  return (LOCALES as readonly string[]).includes(seg) && seg !== DEFAULT_LOCALE
    ? (seg as Locale)
    : DEFAULT_LOCALE;
}

/** Traductor de cadenas de interfaz para un locale. */
export function useT(locale: Locale) {
  return (key: UIKey): string => UI[locale][key];
}

/** Texto localizado desde un objeto { es, en } de las colecciones. */
export function pick<T>(obj: { es: T; en: T }, locale: Locale): T {
  return obj[locale];
}
