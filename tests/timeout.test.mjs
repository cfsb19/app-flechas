import { test } from 'node:test';
import assert from 'node:assert/strict';
import { comTimeout } from '../src/access/timeout.js';

test('resolve com o valor da promessa quando chega a tempo', async () => {
  assert.equal(await comTimeout(Promise.resolve(7), 50), 7);
});

test('rejeita com code timeout quando a promessa fica pendurada', async () => {
  await assert.rejects(comTimeout(new Promise(() => {}), 20), e => e.code === 'timeout');
});

test('propaga o erro original', async () => {
  await assert.rejects(comTimeout(Promise.reject(Object.assign(new Error('x'), { code: 'permission-denied' })), 50), e => e.code === 'permission-denied');
});
