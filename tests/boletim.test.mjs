import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { novoBoletim, caboVazio, entradaDoCabo, calcularBoletim, resumo } from '../src/boletim/state.js';

const casos = JSON.parse(readFileSync(new URL('./casos-validacao.json', import.meta.url)));

const vao910 = () => {
  const B = novoBoletim();
  Object.assign(B, { method: 'pt', a: '417.36', F: '-350.56', cota: '5', HS: '0.689', perna: '0' });
  B.teor.CC = { tipo: 'direta', direta: '14.83', tabela: {} };
  B.teor.CG = { tipo: 'direta', direta: '11.38', tabela: {} };
  for (const c of casos.folha_lbl.filter(c => c.id.startsWith('Vão 9-10'))) {
    const cabo = c.id.split(' ').pop();
    Object.assign(B.cabos[cabo], { H: String(c.H), cad: String(c.cadeia), zf: String(c.zf), z: String(c.z) });
  }
  return B;
};

test('boletim dá os mesmos resultados que a folha LBL (vão 9-10)', () => {
  const R = calcularBoletim(vao910());
  for (const c of casos.folha_lbl.filter(c => c.id.startsWith('Vão 9-10'))) {
    const r = R[c.id.split(' ').pop()];
    assert.ok(Math.abs(r.verdict.f - c.esperado.flecha) < 1e-9, c.id);
    assert.equal(r.verdict.ok, c.esperado.conforme);
  }
});

test('boletim dá os mesmos resultados que a folha LBL (vão 12-13, com CG2)', () => {
  const B = novoBoletim();
  Object.assign(B, { method: 'pt', a: '333.92', F: '-341.81', cota: '-2.36', HS: '0.689', perna: '0' });
  B.teor.CC.direta = '9.49'; B.teor.CG.direta = '7.28';
  const lst = casos.folha_lbl.filter(c => c.id.startsWith('Vão 12-13'));
  for (const c of lst) Object.assign(B.cabos[c.id.split(' ').pop()], { H: String(c.H), cad: String(c.cadeia), zf: String(c.zf), z: String(c.z) });
  const R = calcularBoletim(B);
  for (const c of lst) assert.ok(Math.abs(R[c.id.split(' ').pop()].verdict.f - c.esperado.flecha) < 1e-9, c.id);
});

test('cabos vazios são ignorados', () => {
  const B = vao910(); const R = calcularBoletim(B);
  assert.equal(caboVazio(B, 'CC2'), true); assert.equal(caboVazio(B, 'CC1'), false);
  assert.equal(R.CC2, null); assert.equal(R.CG2, null);
});

test('cadeia preenchida sem leituras conta como vazio', () => {
  const B = novoBoletim(); B.cabos.CC4.cad = '4.24';
  assert.equal(caboVazio(B, 'CC4'), true);
});

test('resumo', () => assert.deepEqual(resumo(calcularBoletim(vao910())), { total: 4, conformes: 4, naoConformes: [] }));

test('valor próprio do cabo substitui o do grupo; sem valor próprio segue o grupo', () => {
  const B = vao910(); B.cabos.CC3.teor = { tipo: 'direta', direta: '14.00', tabela: {} };
  assert.equal(entradaDoCabo(B, 'CC3').ft, '14');
  assert.equal(entradaDoCabo(B, 'CC1').ft, '14.83');
  B.teor.CC.direta = '15';
  assert.equal(entradaDoCabo(B, 'CC1').ft, '15');
  assert.equal(entradaDoCabo(B, 'CC3').ft, '14');
});

test('correção por grupo e interpolação pela tabela', () => {
  const B = vao910(); B.tLocal = '17'; B.corr = { CC: '10', CG: '5' };
  B.teor.CC = { tipo: 'tabela', direta: '', tabela: { '5': '14', '10': '15' } };
  B.teor.CG = { tipo: 'tabela', direta: '', tabela: { '10': '11', '15': '12' } };
  assert.ok(Math.abs(Number(entradaDoCabo(B, 'CC1').ft) - 14.4) < 1e-12);
  assert.ok(Math.abs(Number(entradaDoCabo(B, 'CG1').ft) - 11.4) < 1e-12);
});

test('H vazio no cabo vem da tabela de apoios pelo braço', () => {
  const B = novoBoletim(); B.method = 'pt'; B.tipo = 'AWA1';
  assert.equal(entradaDoCabo(B, 'CC1').H, '31');
  assert.equal(entradaDoCabo(B, 'CC3').H, '25');
  assert.equal(entradaDoCabo(B, 'CC5').H, '19');
  assert.equal(entradaDoCabo(B, 'CG1').H, '35');
  assert.equal(entradaDoCabo(B, 'CG1').HS, '0.87');
});

test('regulação no boletim usa o parâmetro do grupo', () => {
  const B = vao910(); B.modo = 'reg';
  const c = casos.folha_lbl[0];
  B.param.CC = { tipo: 'direta', direta: String(c.esperado.p), tabela: {} };
  const R = calcularBoletim(B);
  assert.ok(Math.abs(R.CC1.reg.z - c.z) < 1e-6);
  assert.equal(R.CG1.reg, undefined); // sem parâmetro CG
  assert.ok(R.CG1.missing.includes('o parâmetro'));
});

test('cadeia vazia vem do cabo anterior do mesmo grupo (não de outro grupo)', () => {
  const B = novoBoletim(); B.method = 'pt';
  B.cabos.CC1.cad = '4.24'; B.cabos.CC3.cad = '3.7'; B.cabos.CG1.cad = '0.34';
  assert.equal(entradaDoCabo(B, 'CC2').cad, '4.24');
  assert.equal(entradaDoCabo(B, 'CC4').cad, '3.7');
  assert.equal(entradaDoCabo(B, 'CG2').cad, '0.34');
  assert.equal(entradaDoCabo(B, 'CG1').cad, '0.34');
  const B2 = novoBoletim(); B2.cabos.CC6.cad = '4'; // CG1 não herda dos CC
  assert.equal(entradaDoCabo(B2, 'CG1').cad, '');
});

test('regulação no método português com desnível do perfil: cabo com H ou cadeia escritos conta', () => {
  const B = vao910(); B.modo = 'reg'; B.dp = '20';
  for (const c of ['CC1', 'CC3', 'CC5', 'CG1']) { B.cabos[c].zf = ''; B.cabos[c].z = ''; }
  B.param.CC.direta = '1484';
  assert.equal(caboVazio(B, 'CC1'), false);
  assert.equal(caboVazio(B, 'CC2'), true);
  const R = calcularBoletim(B);
  assert.ok(R.CC1 && R.CC1.reg && Number.isFinite(R.CC1.reg.z));
});
