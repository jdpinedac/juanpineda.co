# juanpineda.co

Sitio personal de Juan Pineda: multi-página, bilingüe ES/EN, estático y sin
rastreadores. Construido con [Astro](https://astro.build) y servido por
Cloudflare Pages en `https://juanpineda.co` (con `www.juanpineda.co` como
alias).

## Principios

- **Estático puro.** Sin servidor, sin base de datos, sin formularios.
- **Cero terceros en runtime.** Ninguna petición sale del dominio: ni
  analítica, ni fuentes externas, ni CDN. Tipografías del sistema.
- **CSP estricta** como cabecera real (`public/_headers`, la sirve
  Cloudflare Pages): `default-src 'none'`, `frame-ancestors 'none'`, scripts
  solo propios más los hashes de los dos scripts inline de
  `src/layouts/Base.astro` (el anti-parpadeo del tema y el redirect de
  idioma). Si cambias cualquiera, recalcula el hash del contenido exacto
  emitido (`sha256` en base64) y actualízalo en `public/_headers`;
  `npm run build` corre `scripts/check-csp-hash.mjs`, que revisa todas las
  páginas del `dist/` contra esa cabecera y falla si falta un hash.
- **Dependencias mínimas y pineadas.** Astro, MDX, sitemap y RSS; satori y
  resvg solo en build (generan las OG, no viajan al visitante). El hero
  WebGL es un shader propio sin librerías.

## Desarrollo

Requiere Node ≥ 24.22 (la versión exacta está en `.nvmrc`).

```sh
npm ci
npm run dev       # servidor de desarrollo
npm run build     # astro check && astro build → dist/
npm run preview   # sirve dist/
```

## Estructura

- `src/pages/` — ES en la raíz (`/proyectos/`, `/charlas/`, `/sobre-mi/`,
  `/blog/`, `/suscribete/`), EN bajo `/en/`. Wrappers finos sobre las vistas
  de `src/components/views/`. Los feeds RSS (`/rss.xml` y `/en/rss.xml`) se
  generan en `rss.xml.ts`; los enlaces visibles "RSS" llevan a la página
  Suscríbete (el XML crudo asusta a los humanos, y la hoja XSLT que lo
  embellecería está siendo retirada de Chrome).
- `src/content/` — colecciones: `projects/*.yaml`, `talks/*.yaml` (campos
  bilingües `{es,en}`) y `blog/{es,en}/*.mdx` emparejados por
  `translationKey` (el build falla si falta una traducción).
- `src/components/hero/` — hero "Red de Fibonacci": shader WebGL2 (esfera
  de Fibonacci en 3D con tráfico bidireccional y nodos que destellan).
  `signal-field.ts` proyecta los nodos una vez por frame y los pasa por el
  uniform `u_nodes`; la paleta sigue el tema vía `u_light`. Carga diferida,
  fallback estático (la misma constelación en SVG), pausa fuera de viewport
  y respeto de `prefers-reduced-motion`. En `alt/` viven shaders alternos
  (hoy el waterfall SDR): para activar uno, copiarlo sobre
  `signal.frag.glsl` — usan los mismos uniforms.
- `src/i18n/` — rutas localizadas, diccionario de interfaz y utilidades.
- `src/config/site.ts` — datos del sitio: nombre público, correo de contacto,
  LinkedIn/GitHub y títulos por idioma. Cambios de contacto se hacen aquí.
- `src/lib/blog.ts` — helpers del blog y la aserción de parejas de traducción.
- `public/` — `_headers` (CSP y demás cabeceras de seguridad), `_redirects`
  (301 de `/es/`) y favicon. Las imágenes OG (`public/og/`, git-ignorado)
  las genera `scripts/og-images.mjs` en cada build: páginas estructurales
  desde su lista `PAGES`, posts del blog autodescubiertos del frontmatter.

### Idiomas

Español vive en la raíz e inglés bajo `/en/`. En la raíz, un script inline
(el único con hash en la CSP) redirige a `/en/` cuando hay preferencia
guardada (`localStorage.lang === "en"`, la escribe el botón ES/EN) o, en la
primera visita, cuando el navegador está en inglés y no tiene español en
ninguna de sus lenguas (`navigator.languages`). `/es/` es un 301 a
`/?hl=es` (en `public/_redirects`); ese parámetro le dice al script que el
español fue pedido explícitamente y no debe rebotar a `/en/`.

### Tema claro/oscuro

Por defecto manda `prefers-color-scheme`; el botón de la nav fija
`data-theme` en `<html>` y lo guarda en `localStorage.theme` (un script
inline con hash lo aplica antes del primer pintado). Los tokens viven en
`src/styles/tokens.css`: el bloque claro está duplicado a propósito —
media query para la preferencia del sistema y `[data-theme="light"]` para
la elección del botón — así que un cambio de color se hace en ambos. El
shader del hero recibe el tema por `u_light` y reacciona en vivo.

### Añadir contenido

- **Proyecto**: un YAML en `src/content/projects/`. Si `visibility: private`,
  el schema prohíbe `repo` (sale como reseña sin enlace).
- **Charla**: un YAML en `src/content/talks/`. `date` solo ordena la línea de
  tiempo; se muestra `event`.
- **Post**: un MDX en `src/content/blog/es/` y su par en `blog/en/` con el
  mismo `translationKey`. La imagen OG sale sola en el build
  (`/og/post-<translationKey>-<idioma>.png`, con título y descripción del
  frontmatter); el campo `ogImage` queda como override opcional. Un post
  solo se publica cuando su traducción también
  está publicada: los borradores (`draft: true`) van en pareja, porque la
  aserción de parejas los ignora y un publicado con traducción en borrador
  rompe el build.

## Despliegue

Cloudflare Pages construye y publica con cada push a `main` (integración
Git: build `npm run build`, salida `dist`, Node según `.nvmrc`). GitHub
Actions (`.github/workflows/ci.yml`, actions pineadas por SHA) solo verifica
el build. Rollback: cada deploy queda guardado en Cloudflare Pages y se
restaura al instante desde el dashboard (o revirtiendo el merge en `main`).

## Correo

`hola@juanpineda.co` se encamina con Cloudflare Email Routing hacia el buzón
personal (el dominio ya usa nameservers de Cloudflare).

## Licencia

El código (HTML, CSS, TS y GLSL) está bajo licencia MIT (ver `LICENSE`). El
texto y el nombre son del autor y no están cubiertos por esa licencia.
