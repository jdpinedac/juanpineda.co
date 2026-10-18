// Postbuild: todo <script> inline sin atributos debe tener su hash sha256 en
// la meta CSP. Falla el build en vez de romper silenciosamente en producción.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const html = readFileSync('dist/index.html', 'utf8');
const cspMatch = html.match(
  /http-equiv="Content-Security-Policy"\s+content="([^"]+)"/,
);
if (!cspMatch) {
  console.error('CSP: no se encontró la meta Content-Security-Policy.');
  process.exit(1);
}
const csp = cspMatch[1];
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
  (m) => m[1],
);

let fail = false;
for (const s of scripts) {
  const hash = 'sha256-' + createHash('sha256').update(s).digest('base64');
  if (!csp.includes(`'${hash}'`)) {
    console.error(`CSP: falta el hash '${hash}' para el script inline:\n${s}`);
    fail = true;
  }
}
if (fail) {
  console.error(
    'Regenera el hash y actualiza la meta CSP en src/layouts/Base.astro.',
  );
  process.exit(1);
}
console.log(`CSP ok: ${scripts.length} script(s) inline con hash presente.`);
