export const LOCALES = ['es', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'es';

/** Mapa de rutas con slugs localizados. Siempre con slash final. */
export const ROUTES = {
  home: { es: '/', en: '/en/' },
  projects: { es: '/proyectos/', en: '/en/projects/' },
  talks: { es: '/charlas/', en: '/en/talks/' },
  about: { es: '/sobre-mi/', en: '/en/about/' },
  blog: { es: '/blog/', en: '/en/blog/' },
  rss: { es: '/rss.xml', en: '/en/rss.xml' },
  subscribe: { es: '/suscribete/', en: '/en/subscribe/' },
} as const;

export type RouteKey = keyof typeof ROUTES;

/** Ruta equivalente en el otro idioma para una página estructural. */
export function altRoute(key: RouteKey, locale: Locale): string {
  const other: Locale = locale === 'es' ? 'en' : 'es';
  return ROUTES[key][other];
}
