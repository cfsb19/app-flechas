// Correr na raiz do projeto com: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calcularCabo, solveTangent, geometriaPortugues } from '../core/flechas-core.mjs';

const casos = JSON.parse(readFileSync(new URL('./casos-validacao.json', import.meta.url)));
const perto = (v, e, tol, msg) => assert.ok(Math.abs(v - e) <= tol, `${msg}: ${v} vs ${e}`);

for (const c of casos.folha_lbl) {
  test(`Método português, folha LBL: ${c.id}`, () => {
    const r = calcularCabo('pt', c);
    perto(r.p, c.esperado.p, 1e-3, 'parâmetro');
    perto(r.flecha, c.esperado.flecha, 1e-5, 'flecha');
    assert.equal(r.conforme, c.esperado.conforme);
    assert.equal(r.raizes.filter(x => x.u >= 0 && x.u <= c.a).length, 1, 'uma só tangência dentro do vão');
  });
}

for (const c of casos.regressao_internacional) {
  test(`Método internacional, regressão: ${c.id}`, () => {
    const r = calcularCabo('int', c);
    perto(r.flecha, c.esperado.flecha, 5e-4, 'flecha');
    assert.equal(r.conforme, c.esperado.conforme);
  });
}

test('Leitura esperada reproduz a flecha teórica (ida e volta)', () => {
  const c = casos.folha_lbl[0];
  const r = calcularCabo('pt', c);
  const r2 = calcularCabo('pt', { ...c, z: r.leituraEsperada.z });
  perto(r2.flecha, c.ft, 1e-6, 'flecha com a leitura esperada');
  assert.ok(r.leituraEsperada.min < r.leituraEsperada.z && r.leituraEsperada.z < r.leituraEsperada.max);
});

test('Teodolito acima do cabo: sem visada tangente', () => {
  const g = geometriaPortugues({ a: 400, F: -50, cota: 60, H: 30, HS: 0.7, cadeia: 4, zf: 99 });
  assert.equal(solveTangent(400, g.d, 1500, g.t, g.h).above, true);
});

test('Limites de conformidade: −2,5 % e +1,5 %', () => {
  const base = { a: 425.48, t: 60, z1: 59.5046, z2: 81.6059, z: 82.1749 };
  const f = calcularCabo('int', base).flecha;
  assert.equal(calcularCabo('int', { ...base, ft: f / 1.0149 }).conforme, true);
  assert.equal(calcularCabo('int', { ...base, ft: f / 1.0151 }).conforme, false);
  assert.equal(calcularCabo('int', { ...base, ft: f / 0.9751 }).conforme, true);
  assert.equal(calcularCabo('int', { ...base, ft: f / 0.9749 }).conforme, false);
});
