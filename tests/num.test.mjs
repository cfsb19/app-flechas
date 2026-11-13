import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNum, fmt } from '../src/num.js';

test('parseNum aceita vírgula, ponto, sinal menos tipográfico e espaços', () => {
  assert.equal(parseNum('425,48'), 425.48);
  assert.equal(parseNum('425.48'), 425.48);
  assert.equal(parseNum('−350,56'), -350.56);
  assert.equal(parseNum(' 1 234,5 '), 1234.5);
  assert.ok(Number.isNaN(parseNum('')));
  assert.ok(Number.isNaN(parseNum('12,3,4')));
});

test('fmt usa formato pt-PT', () => {
  assert.equal(fmt(14.6898, 2), '14,69');
  assert.equal(fmt(NaN, 2), '–');
});
