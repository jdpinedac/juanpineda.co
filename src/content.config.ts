import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const localized = z.object({ es: z.string(), en: z.string() });

const projects = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/projects' }),
  schema: z
    .object({
      name: z.string(),
      group: z.enum(['tools', 'ham-radio']),
      lang: z.string(),
      visibility: z.enum(['public', 'private']),
      repo: z.string().url().optional(),
      liveUrl: z.string().url().optional(),
      summary: localized,
      description: localized.optional(),
      featured: z.boolean().default(false),
      order: z.number().default(0),
    })
    .refine((p) => p.visibility === 'public' || !p.repo, {
      message: 'un proyecto privado no puede llevar enlace a repo',
    }),
});

const talks = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/talks' }),
  schema: z.object({
    title: localized,
    event: z.string(),
    /** Solo para ordenar la línea de tiempo; no se muestra el día. */
    date: z.coerce.date(),
    kind: z.enum(['workshop', 'talk', 'demo']),
    repo: z.string().url().optional(),
    siteUrl: z.string().url().optional(),
    summary: localized,
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    translationKey: z.string(),
    draft: z.boolean().default(false),
    ogImage: z.string().optional(),
  }),
});

export const collections = { projects, talks, blog };
