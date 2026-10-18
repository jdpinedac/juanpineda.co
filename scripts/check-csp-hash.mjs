// Postbuild: todo <script> inline sin atributos, en cualquier página del
// dist, debe tener su hash sha256 en la Content-Security-Policy de
// public/_headers (la sirve Cloudflare Pages como cabecera real).
// Falla el build en vez de romper silenciosamente en producción.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const headers = readFileSync('dist/_headers', 'utf8');
const cspMatch = headers.match(/^\s*Content-Security-Policy:\s*(.+)$/m);
if (!cspMatch) {
  console.error('CSP: dist/_headers no define Content-Security-Policy.');
  process.exit(1);
}
const csp = cspMatch[1];

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
  for (const [, s] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
    total += 1;
    const hash = 'sha256-' + createHash('sha256').update(s).digest('base64');
    if (!csp.includes(`'${hash}'`)) {
      console.error(`CSP: en ${page} falta el hash '${hash}' para:\n${s}`);
      fail = true;
    }
  }
}
if (fail) {
  console.error('Regenera el hash y actualiza la CSP en public/_headers.');
  process.exit(1);
}
console.log(
  `CSP ok: ${pages.length} página(s), ${total} script(s) inline con hash presente.`,
);
