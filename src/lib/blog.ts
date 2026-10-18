import { getCollection, type CollectionEntry } from 'astro:content';
import { DEFAULT_LOCALE, type Locale } from '../i18n/routes';

export type Post = CollectionEntry<'blog'>;

/** Locale de un post a partir de su id ("es/slug" | "en/slug"). */
export function postLocale(post: Post): Locale {
  return (post.id.split('/')[0] as Locale) ?? DEFAULT_LOCALE;
}

/** Slug del post sin el prefijo de locale. */
export function postSlug(post: Post): string {
  return post.id.split('/').slice(1).join('/');
}

/** Ruta pública del post, con slash final. */
export function postPath(post: Post): string {
  const slug = postSlug(post);
  return postLocale(post) === 'es' ? `/blog/${slug}/` : `/en/blog/${slug}/`;
}

/** Posts publicados de un locale, del más nuevo al más viejo. */
export async function getPosts(locale: Locale): Promise<Post[]> {
  const all = await getCollection(
    'blog',
    (p) => !p.data.draft && postLocale(p) === locale,
  );
  return all.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

/** El post equivalente en el otro idioma, por translationKey. */
export async function getTranslation(post: Post): Promise<Post | undefined> {
  const other: Locale = postLocale(post) === 'es' ? 'en' : 'es';
  const candidates = await getPosts(other);
  return candidates.find((p) => p.data.translationKey === post.data.translationKey);
}

/**
 * Invariante del plan: cada translationKey existe exactamente una vez por
 * idioma. Se ejecuta en build (desde getStaticPaths) y revienta si no.
 */
export async function assertTranslationPairs(): Promise<void> {
  const all = await getCollection('blog', (p) => !p.data.draft);
  const seen = new Map<string, Set<Locale>>();
  for (const post of all) {
    const key = post.data.translationKey;
    const locale = postLocale(post);
    const locales = seen.get(key) ?? new Set<Locale>();
    if (locales.has(locale)) {
      throw new Error(`translationKey duplicada en ${locale}: ${key}`);
    }
    locales.add(locale);
    seen.set(key, locales);
  }
  for (const [key, locales] of seen) {
    if (locales.size !== 2) {
      throw new Error(`translationKey sin pareja (${[...locales]}): ${key}`);
    }
  }
}

export function formatDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'es' ? 'es-CO' : 'en-US', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(date);
}
