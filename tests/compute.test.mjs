import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeCabo } from '../src/calc/compute.js';
import { calcularCabo } from '../core/flechas-core.mjs';

const casos = JSON.parse(readFileSync(new URL('./casos-validacao.json', import.meta.url)));
const S0 = { method: 'pt', modo: 'ver', a: '', dp: '', t: '', H: '', HS: '', perna: '', cad: '', z1: '', z2: '', cota: '', F: '', zf: '', z: '', temp: '', ft: '', preg: '', tolA: '2,5', tolB: '1,5' };
const sPT = c => ({ ...S0, a: String(c.a), F: String(c.F), cota: String(c.cota), H: String(c.H), HS: String(c.HS), perna: String(c.perna), cad: String(c.cadeia), zf: String(c.zf), z: String(c.z), ft: String(c.ft) });

for (const c of casos.folha_lbl) {
  test(`verificação igual ao núcleo: ${c.id}`, () => {
    const R = computeCabo(sPT(c)); const ref = calcularCabo('pt', c);
    assert.ok(Math.abs(R.meas.p - ref.p) < 1e-6);
    assert.ok(Math.abs(R.verdict.f - ref.flecha) < 1e-9);
    assert.equal(R.verdict.ok, ref.conforme);
  });
}

test('regulação: o parâmetro medido dá de volta a leitura medida', () => {
  const c = casos.folha_lbl[0]; const p = calcularCabo('pt', c).p;
  const R = computeCabo({ ...sPT(c), modo: 'reg', preg: String(p), z: '', ft: '' });
  assert.equal(R.modo, 'reg');
  assert.ok(Math.abs(R.reg.z - c.z) < 1e-6);
  assert.ok(Math.abs(R.reg.f - c.esperado.flecha) < 1e-6);
  assert.ok(R.reg.zMin < R.reg.z && R.reg.z < R.reg.zMax);
  assert.equal(R.verdict, undefined);
});

test('regulação ignora Z e flecha teórica escritos', () => {
  const c = casos.folha_lbl[0]; const p = calcularCabo('pt', c).p;
  const R = computeCabo({ ...sPT(c), modo: 'reg', preg: String(p), z: '90', ft: '1' });
  assert.ok(Math.abs(R.reg.z - c.z) < 1e-6); assert.equal(R.meas, undefined);
});

test('regulação internacional (exemplo da app)', () => {
  const base = { ...S0, method: 'int', a: '425,48', t: '60', z1: '59,5046', z2: '81,6059' };
  const p = computeCabo({ ...base, z: '82,1749' }).meas.p;
  assert.ok(Math.abs(computeCabo({ ...base, modo: 'reg', preg: String(p) }).reg.z - 82.1749) < 1e-6);
});

test('regulação sem parâmetro pede-o; parâmetro negativo é erro', () => {
  const c = casos.folha_lbl[0];
  assert.ok(computeCabo({ ...sPT(c), modo: 'reg', preg: '' }).missing.includes('o parâmetro'));
  assert.ok(computeCabo({ ...sPT(c), modo: 'reg', preg: '-5' }).errors.includes('O parâmetro tem de ser maior que zero.'));
});

test('regulação com tangência fora do vão: sem leitura e com erro', () => {
  const S = { ...S0, method: 'int', modo: 'reg', a: '425,48', t: '60', z1: '59,5046', z2: '81,6059', preg: '8000' };
  const R = computeCabo(S);
  assert.equal(R.reg, undefined);
  assert.ok(R.errors.some(e => e.includes('fora do vão')), R.errors.join(' | '));
});
