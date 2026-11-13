// Junta o build de dist-local/ num único flechas.html (JS e CSS embutidos), para abrir sem servidor.
import { readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'dist-local';
let html = readFileSync(join(dir, 'index.html'), 'utf8');
html = html.replace(/<script type="module" crossorigin src="\.?\/?([^"]+)"><\/script>/g, (_, src) =>
  `<script type="module">${readFileSync(join(dir, src), 'utf8').replace(/<\/script/gi, '<\\/script')}</script>`);
html = html.replace(/<link rel="stylesheet" crossorigin href="\.?\/?([^"]+)">/g, (_, href) =>
  `<style>${readFileSync(join(dir, href), 'utf8')}</style>`);
// Ícones e manifesto da PWA não existem nesta versão.
html = html.replace(/\s*<link rel="(icon|apple-touch-icon|manifest)"[^>]*>/g, '');
if (/<script[^>]+src=|<link[^>]+stylesheet[^>]+href=/.test(html)) throw new Error('Ficou um recurso externo por embutir.');
for (const f of readdirSync(dir)) rmSync(join(dir, f), { recursive: true, force: true });
writeFileSync(join(dir, 'flechas.html'), html);
console.log(`dist-local/flechas.html: ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`);
