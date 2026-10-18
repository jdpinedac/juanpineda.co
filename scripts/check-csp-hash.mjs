// Postbuild: todo <script> inline sin atributos, en cualquier página del
// dist, debe tener su hash sha256 en la meta CSP de esa misma página.
// Falla el build en vez de romper silenciosamente en producción.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const pages = readdirSync('dist', { recursive: true })
  .map(String)
  .filter((f) => f.endsWith('.html'))
  .map((f) => join('dist', f));

if (pages.length === 0) {
  console.error('CSP: no hay páginas .html en dist/.');
  process.exit(1);
}

let fail = false;
let total = 0;
for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
    (m) => m[1],
  );
  if (scripts.length === 0) continue;
  const cspMatch = html.match(
    /http-equiv="Content-Security-Policy"\s+content="([^"]+)"/,
  );
  if (!cspMatch) {
    console.error(`CSP: ${page} tiene scripts inline y ninguna meta CSP.`);
    fail = true;
    continue;
  }
  const csp = cspMatch[1];
  for (const s of scripts) {
    total += 1;
    const hash = 'sha256-' + createHash('sha256').update(s).digest('base64');
    if (!csp.includes(`'${hash}'`)) {
      console.error(`CSP: en ${page} falta el hash '${hash}' para:\n${s}`);
      fail = true;
    }
  }
}
if (fail) {
  console.error(
    'Regenera el hash y actualiza la meta CSP en src/layouts/Base.astro.',
  );
  process.exit(1);
}
console.log(
  `CSP ok: ${pages.length} página(s), ${total} script(s) inline con hash presente.`,
);
