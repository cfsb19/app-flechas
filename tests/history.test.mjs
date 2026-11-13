import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { openHistory } from '../src/history/store.js';
import { toJSON, toCSV, parseImport } from '../src/history/export.js';

const rec = (id, savedAt) => ({
  id, savedAt, vao: '9-10', cabo: 'CC1', method: 'pt', inputs: { a: '417,36' },
  result: { a: 417.36, ft: 14.83, flecha: 14.689865, desvio: -0.00954, conforme: true, p: 1484.84 },
});

test('add, list (mais recente primeiro) e remove', async () => {
  const h = await openHistory(new IDBFactory());
  await h.add(rec('a', '2026-11-13T10:00:00Z'));
  await h.add(rec('b', '2026-11-13T11:00:00Z'));
  assert.deepEqual((await h.list()).map(r => r.id), ['b', 'a']);
  await h.remove('a');
  assert.deepEqual((await h.list()).map(r => r.id), ['b']);
});

test('importMany não duplica e mantém o existente', async () => {
  const h = await openHistory(new IDBFactory());
  await h.add(rec('a', '2026-11-13T10:00:00Z'));
  const r = await h.importMany([{ ...rec('a', '2026-11-13T10:00:00Z'), vao: 'outro' }, rec('c', '2026-11-13T12:00:00Z')]);
  assert.deepEqual(r, { added: 1, skipped: 1 });
  assert.equal((await h.list()).find(x => x.id === 'a').vao, '9-10');
});

test('sem IndexedDB devolve null', async () => assert.equal(await openHistory(undefined), null));

test('IndexedDB que falha ao abrir devolve null', async () => {
  const broken = { open() { throw new Error('bloqueado'); } };
  assert.equal(await openHistory(broken), null);
});

test('JSON ida e volta', () => {
  const txt = toJSON([rec('a', '2026-11-13T10:00:00Z')], new Date('2026-11-13T12:00:00Z'));
  assert.equal(JSON.parse(txt).exportadoEm, '2026-11-13T12:00:00.000Z');
  assert.deepEqual(parseImport(txt), { records: [rec('a', '2026-11-13T10:00:00Z')], invalid: 0 });
});

test('importar ficheiro estranho', () => {
  assert.throws(() => parseImport('não é json'), /não é uma exportação/);
  assert.throws(() => parseImport('{"app":"outra","medicoes":[]}'), /não é uma exportação/);
  assert.throws(() => parseImport('{"app":"flechas","medicoes":{}}'), /não é uma exportação/);
  assert.equal(parseImport('{"app":"flechas","versao":1,"medicoes":[{"id":1}]}').invalid, 1);
});

test('CSV para Excel PT', () => {
  const lines = toCSV([rec('a', '2026-11-13T10:00:00Z')]).replace(/^﻿/, '').trim().split('\r\n');
  assert.equal(lines[0], 'data;vao;cabo;metodo;vao_m;flecha_teorica_m;flecha_medida_m;desvio_pct;resultado');
  assert.match(lines[1], /;9-10;CC1;Português;417,36;14,83;14,690;-0,95;Conforme$/);
});

test('CSV protege campos com ; ou aspas', () => {
  const r = { ...rec('a', '2026-11-13T10:00:00Z'), vao: 'Vão "A"; 1' };
  assert.match(toCSV([r]), /;"Vão ""A""; 1";/);
});
