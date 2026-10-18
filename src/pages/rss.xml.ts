import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE } from '../config/site';
import { getPosts, postPath } from '../lib/blog';

export async function GET(context: APIContext) {
  const posts = await getPosts('es');
  return rss({
    title: SITE.title.es,
    description: SITE.description.es,
    site: context.site!,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.pubDate,
      link: postPath(p),
    })),
    customData: '<language>es-co</language>',
  });
}
