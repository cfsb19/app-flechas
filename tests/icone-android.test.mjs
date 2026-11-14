import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const res = p => new URL('../android/app/src/main/res/' + p, import.meta.url);
const pngSize = buf => [buf.readUInt32BE(16), buf.readUInt32BE(20)];
const sha = buf => createHash('sha256').update(buf).digest('hex');
const D = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

test('ícone do APK igual ao da app no iPhone (mesmo desenho, 192 px)', () => {
  assert.equal(sha(readFileSync(res('mipmap-xxxhdpi/ic_launcher.png'))), sha(readFileSync(new URL('../public/icons/icon-192.png', import.meta.url))));
});

test('ícones em todos os tamanhos do Android', () => {
  for (const [d, k] of Object.entries(D)) {
    assert.deepEqual(pngSize(readFileSync(res(`mipmap-${d}/ic_launcher.png`))), [48 * k, 48 * k], d);
    assert.deepEqual(pngSize(readFileSync(res(`mipmap-${d}/ic_launcher_round.png`))), [48 * k, 48 * k], d);
    assert.deepEqual(pngSize(readFileSync(res(`mipmap-${d}/ic_launcher_foreground.png`))), [108 * k, 108 * k], d);
  }
});

test('fundo do ícone adaptativo é o azul da app', () => {
  assert.match(readFileSync(res('values/ic_launcher_background.xml'), 'utf8'), /#14213D/i);
});
