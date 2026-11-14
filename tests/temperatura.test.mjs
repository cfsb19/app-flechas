import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CABOS, grupoDoCabo, bracoDoCabo, tempCalculo, linhasTabela, resolverTeorico,
  temperaturaDoDia, lembrarTemperatura, lerCorrecoes, guardarCorrecoes,
} from '../src/calc/temperatura.js';

const memStorage = () => { const s = new Map(); return { getItem: k => s.get(k) ?? null, setItem: (k, v) => s.set(k, String(v)), removeItem: k => s.delete(k) }; };

test('grupo e braço por cabo', () => {
  assert.deepEqual(CABOS, ['CC1', 'CC2', 'CC3', 'CC4', 'CC5', 'CC6', 'CG1', 'CG2']);
  assert.equal(grupoDoCabo('CC4'), 'CC'); assert.equal(grupoDoCabo('CG2'), 'CG');
  assert.deepEqual(CABOS.map(bracoDoCabo), ['sup', 'sup', 'med', 'med', 'hu', 'hu', 'ht', 'ht']);
});

test('Tc = Tlocal − correção; correção vazia conta 0', () => {
  assert.equal(tempCalculo(15, 10), 5);
  assert.equal(tempCalculo(15, NaN), 15);
  assert.ok(Number.isNaN(tempCalculo(NaN, 10)));
});

test('linhas da tabela', () => {
  assert.deepEqual(linhasTabela(5), [5]);
  assert.deepEqual(linhasTabela(0), [0]);
  assert.deepEqual(linhasTabela(7), [5, 10]);
  assert.deepEqual(linhasTabela(17.5), [15, 20]);
  assert.deepEqual(linhasTabela(-3), [-5, 0]);
  assert.deepEqual(linhasTabela(NaN), []);
  assert.deepEqual(linhasTabela(5.0000000001), [5]);
  assert.deepEqual(linhasTabela(-10), [-10]);
});

test('resolverTeorico direta e pela tabela', () => {
  assert.equal(resolverTeorico({ tipo: 'direta', direta: '12,79', tabela: {} }, 7), 12.79);
  assert.equal(resolverTeorico({ tipo: 'tabela', direta: '', tabela: { '5': '12,79' } }, 5), 12.79);
  assert.ok(Math.abs(resolverTeorico({ tipo: 'tabela', direta: '', tabela: { '5': '12,00', '10': '13,00' } }, 7) - 12.4) < 1e-12);
  assert.ok(Math.abs(resolverTeorico({ tipo: 'tabela', direta: '', tabela: { '-5': '10', '0': '11' } }, -3) - 10.4) < 1e-12);
  assert.ok(Number.isNaN(resolverTeorico({ tipo: 'tabela', direta: '', tabela: { '5': '12' } }, 7)));
  assert.ok(Number.isNaN(resolverTeorico({ tipo: 'tabela', direta: '', tabela: { '5': '12' } }, NaN)));
  assert.ok(Number.isNaN(resolverTeorico(null, 5)));
});

test('temperatura do dia só vale no mesmo dia', () => {
  const st = memStorage();
  lembrarTemperatura(st, '17', '2026-11-13');
  assert.equal(temperaturaDoDia(st, '2026-11-13'), '17');
  assert.equal(temperaturaDoDia(st, '2026-11-14'), '');
});

test('correções guardadas', () => {
  const st = memStorage();
  assert.deepEqual(lerCorrecoes(st), { CC: '', CG: '' });
  guardarCorrecoes(st, { CC: '10', CG: '5' });
  assert.deepEqual(lerCorrecoes(st), { CC: '10', CG: '5' });
});
