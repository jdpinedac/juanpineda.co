#!/usr/bin/env node
// Genera las imágenes OG 1200x630 en public/og/ con satori + resvg.
// Corre dentro de `npm run build` (también lo ejecuta Cloudflare Pages).
// Las páginas estructurales van en PAGES; los posts del blog se descubren
// solos desde su frontmatter: un post nuevo no necesita ningún paso manual.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'og');
const W = 1200;
const H = 630;

const BG = '#0c1117';
const TEAL = '#7fd8c8';
const VIO = '#8f7dff';
const MUTED = '#98a0ab';
const STRONG = '#f5f6f8';

const serif = readFileSync(join(ROOT, 'scripts/fonts/DejaVuSerif.ttf'));
const mono = readFileSync(join(ROOT, 'scripts/fonts/DejaVuSansMono.ttf'));

const h = (type, style, children) => ({ type, props: { style, children } });

// Niebla de espectro: blobs radiales deterministas (sin blur: el gradiente
// radial ya es suave). Semilla fija, como el random.Random(73) del PIL.
function mulberry(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function background() {
  const rnd = mulberry(73);
  const blobs = [];
  for (let i = 0; i < 14; i++) {
    const x = -100 + rnd() * (W + 200);
    const y = -80 + rnd() * (H + 160);
    const r = 120 + rnd() * 220;
    const teal = rnd() < 0.55;
    const alpha = (0.05 + rnd() * 0.07) * (0.4 + (0.6 * y) / H);
    blobs.push(
      h('div', {
        position: 'absolute',
        left: x - r,
        top: y - r,
        width: 2 * r,
        height: 2 * r,
        backgroundImage: `radial-gradient(circle, ${teal ? 'rgba(127,216,200,' : 'rgba(143,125,255,'}${alpha.toFixed(3)}) 0%, rgba(12,17,23,0) 70%)`,
      })
    );
  }

  // Portadoras verticales (posición, halo, intensidad como en el PIL).
  const carriers = [
    [180, 42, 0.5], [430, 30, 0.34], [905, 48, 0.58], [1105, 26, 0.38],
  ].map(([fx, glow, a]) =>
    h('div', {
      position: 'absolute',
      left: fx - glow,
      top: 0,
      width: 2 * glow,
      height: H,
      backgroundImage: `linear-gradient(90deg, rgba(127,216,200,0) 0%, rgba(127,216,200,${a}) 50%, rgba(127,216,200,0) 100%)`,
    })
  );

  // Banda FFT al pie.
  const bars = [];
  for (let i = 0; i <= W / 10; i++) {
    const t = (i * 10) / W;
    const amp = 24 + 60 * Math.abs(Math.sin(i * 0.55) * Math.cos(i * 0.21)) + rnd() * 18;
    const lerp = (a, b) => Math.round(a + (b - a) * t);
    bars.push(
      h('div', {
        position: 'absolute',
        left: i * 10,
        top: H - amp,
        width: 8,
        height: amp,
        backgroundColor: `rgba(${lerp(127, 143)},${lerp(216, 125)},${lerp(200, 255)},0.27)`,
      })
    );
  }

  // Scrim para legibilidad del texto.
  const scrim = h('div', {
    position: 'absolute',
    left: 0,
    top: 0,
    width: W,
    height: H,
    backgroundImage:
      'linear-gradient(180deg, rgba(12,17,23,0.30) 0%, rgba(12,17,23,0.10) 35%, rgba(12,17,23,0.62) 100%)',
  });

  return [...blobs, ...carriers, ...bars, scrim];
}

// Serif del mayor tamaño (≤92) con el que el título cabe en ~1020 px.
const titleSize = (title) =>
  Math.max(48, Math.min(92, Math.floor(1860 / Math.max(title.length, 1))));

function card(kicker, title, tag, footer) {
  const text = (top, size, color, family, content) =>
    h('div', {
      position: 'absolute', left: 90, top, fontSize: size, color, fontFamily: family,
    }, content);
  return h(
    'div',
    { width: W, height: H, display: 'flex', backgroundColor: BG, position: 'relative' },
    [
      ...background(),
      text(208, 20, TEAL, 'DejaVu Mono', kicker),
      text(252, titleSize(title), STRONG, 'DejaVu Serif', title),
      text(392, 24, MUTED, 'DejaVu Mono', tag),
      text(548, 20, MUTED, 'DejaVu Mono', footer),
    ]
  );
}

async function render(filename, node) {
  const svg = await satori(node, {
    width: W,
    height: H,
    fonts: [
      { name: 'DejaVu Serif', data: serif, weight: 400, style: 'normal' },
      { name: 'DejaVu Mono', data: mono, weight: 400, style: 'normal' },
    ],
  });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
  writeFileSync(join(OUT, `${filename}.png`), png);
  console.log(`public/og/${filename}.png`);
}

// --- Páginas estructurales -------------------------------------------------
const FOOTER = 'Juan Pineda · Medellín, Colombia';
const PAGES = [
  ['default-es', 'RX · JUANPINEDA.CO', 'Juan Pineda',
    'NUBE · DEVSECOPS · RADIOAFICIÓN · HPC', 'Medellín, Colombia'],
  ['default-en', 'RX · JUANPINEDA.CO', 'Juan Pineda',
    'CLOUD · DEVSECOPS · HAM RADIO · HPC', 'Medellín, Colombia'],
  ['charlas-es', 'EN EL AIRE · JUANPINEDA.CO', 'Charlas 2026',
    'SEGURIDAD Y REDES PARA LA INDUSTRIA AV', FOOTER],
  ['charlas-en', 'ON THE AIR · JUANPINEDA.CO', 'Talks 2026',
    'SECURITY AND NETWORKING FOR THE AV INDUSTRY', FOOTER],
  ['proyectos-es', 'SEÑAL FUERTE · JUANPINEDA.CO', 'Proyectos',
    'HERRAMIENTAS PROPIAS · RADIOAFICIÓN', FOOTER],
  ['proyectos-en', 'STRONG SIGNAL · JUANPINEDA.CO', 'Projects',
    'TOOLS OF MY OWN · HAM RADIO', FOOTER],
  ['sobre-mi-es', 'QRV DESDE MEDELLÍN', 'Sobre mí',
    'NUBE · DEVSECOPS · HPC · RADIOAFICIÓN', FOOTER],
  ['sobre-mi-en', 'QRV FROM MEDELLÍN', 'About',
    'CLOUD · DEVSECOPS · HPC · HAM RADIO', FOOTER],
  ['blog-es', 'BITÁCORA · JUANPINEDA.CO', 'Blog',
    'NOTAS SOBRE NUBE, SEGURIDAD Y RADIO', FOOTER],
  ['blog-en', 'LOGBOOK · JUANPINEDA.CO', 'Blog',
    'NOTES ON CLOUD, SECURITY AND RADIO', FOOTER],
  ['kit-es', 'PARA ORGANIZADORES', 'Kit de prensa',
    'BIO · CHARLAS · MATERIAL GRÁFICO', FOOTER],
  ['kit-en', 'FOR ORGANIZERS', 'Speaker kit',
    'BIO · TALKS · GRAPHIC ASSETS', FOOTER],
];

// --- Posts del blog: descubiertos del frontmatter ---------------------------
function frontmatter(path) {
  const src = readFileSync(path, 'utf8');
  const m = src.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const posts = [];
for (const lang of ['es', 'en']) {
  const dir = join(ROOT, 'src/content/blog', lang);
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.mdx')) continue;
    const fm = frontmatter(join(dir, f));
    if (fm.draft === 'true') continue;
    const year = String(fm.pubDate ?? '').slice(0, 4);
    let tag = String(fm.description ?? '').toUpperCase();
    if (tag.length > 64) tag = tag.slice(0, 61).trimEnd() + '…';
    posts.push([
      `post-${fm.translationKey}-${lang}`,
      `BLOG · ${year}`,
      fm.title ?? '',
      tag,
      FOOTER,
    ]);
  }
}

mkdirSync(OUT, { recursive: true });
for (const [file, kicker, title, tag, footer] of [...PAGES, ...posts]) {
  await render(file, card(kicker, title, tag, footer));
}
