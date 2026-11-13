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

const HEAD = 'data;vao;cabo;modo;metodo;temp_local_c;temp_calculo_c;vao_m;flecha_teorica_m;flecha_medida_m;desvio_pct;resultado;parametro_m;leitura_alvo_grad';
const linhas = txt => txt.replace(/^﻿/, '').trim().split('\r\n');

test('CSV para Excel PT (registo antigo, sem kind, continua a exportar)', () => {
  const lines = linhas(toCSV([rec('a', '2026-11-13T10:00:00Z')]));
  assert.equal(lines[0], HEAD);
  assert.match(lines[1], /;9-10;CC1;Verificação;Português;;;417,36;14,83;14,690;-0,95;Conforme;1484,84;$/);
});

test('CSV com temperaturas', () => {
  const r = { ...rec('a', '2026-11-13T10:00:00Z'), kind: 'cabo', modo: 'ver', tLocal: 17, tc: 7 };
  assert.match(linhas(toCSV([r]))[1], /;Verificação;Português;17;7;417,36;/);
});

const bol = (id) => ({
  id, kind: 'boletim', savedAt: '2026-11-13T10:00:00Z', vao: '9-10', method: 'pt', modo: 'ver',
  boletim: { a: '417,36', tLocal: '15', corr: { CC: '10', CG: '5' }, cabos: {} },
  resultados: {
    CC1: { flecha: 14.689865, desvio: -0.00954, conforme: true, p: 1484.84, ft: 14.83, tc: 5 },
    CC2: null,
    CG1: { flecha: 11.240929, desvio: -0.01237, conforme: true, p: 1939.11, ft: 11.38, tc: 10 },
  },
});

test('boletim exporta uma linha por cabo com resultado', () => {
  const lines = linhas(toCSV([bol('b')]));
  assert.equal(lines.length, 3);
  assert.match(lines[1], /;9-10;CC1;Verificação;Português;15;5;417,36;14,83;14,690;-0,95;Conforme;1484,84;$/);
  assert.match(lines[2], /;9-10;CG1;Verificação;Português;15;10;417,36;11,38;11,241;-1,24;Conforme;1939,11;$/);
});

test('regulação no CSV: parâmetro e leitura a apontar, sem flecha medida', () => {
  const r = { ...rec('r', '2026-11-13T10:00:00Z'), kind: 'cabo', modo: 'reg',
    result: { a: 417.36, ft: 14.6899, flecha: 14.6899, p: 1484.842, z: 98.844, zMin: 98.82, zMax: 98.87 } };
  assert.match(linhas(toCSV([r]))[1], /;Regulação;Português;;;417,36;14,69;;;;1484,84;98,8440$/);
});

test('importa boletim e rejeita boletim sem dados', () => {
  const ok = parseImport(toJSON([bol('b')], new Date('2026-11-13T12:00:00Z')));
  assert.equal(ok.records.length, 1); assert.equal(ok.invalid, 0);
  const bad = parseImport(JSON.stringify({ app: 'flechas', versao: 1, medicoes: [{ id: 'x', kind: 'boletim', savedAt: 's', method: 'pt' }] }));
  assert.equal(bad.invalid, 1);
});

test('CSV protege campos com ; ou aspas', () => {
  const r = { ...rec('a', '2026-11-13T10:00:00Z'), vao: 'Vão "A"; 1' };
  assert.match(toCSV([r]), /;"Vão ""A""; 1";/);
});
