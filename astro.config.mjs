// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://juanpineda.co',
  output: 'static',
  trailingSlash: 'always',
  build: {
    // CSS externo para que la CSP pueda ser style-src 'self'
    inlineStylesheets: 'never',
  },
  vite: {
    build: {
      // Scripts siempre externos: la CSP solo lista el hash del redirect.
      assetsInlineLimit: 0,
    },
  },
  i18n: {
    locales: ['es', 'en'],
    defaultLocale: 'es',
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    mdx(),
    // Los alternates van como hreflang en cada página; la opción i18n del
    // sitemap no sabe parear slugs localizados. Fuera el stub noindex /es/.
    sitemap({
      filter: (page) => page !== 'https://juanpineda.co/es/',
    }),
  ],
});
