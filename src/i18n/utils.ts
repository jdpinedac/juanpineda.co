import type { Locale } from './routes';
import { UI, type UIKey } from './ui';

/** Traductor de cadenas de interfaz para un locale. */
export function useT(locale: Locale) {
  return (key: UIKey): string => UI[locale][key];
}

/** Texto localizado desde un objeto { es, en } de las colecciones. */
export function pick<T>(obj: { es: T; en: T }, locale: Locale): T {
  return obj[locale];
}
