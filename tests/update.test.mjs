import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isNewer, checkApkUpdate } from '../src/update/check.js';

test('isNewer', () => {
  assert.equal(isNewer('1.2.0', '1.1.9'), true);
  assert.equal(isNewer('1.10.0', '1.9.0'), true);
  assert.equal(isNewer('1.2.0', '1.2.0'), false);
  assert.equal(isNewer('1.1.0', '1.2.0'), false);
  assert.equal(isNewer('lixo', '1.0.0'), false);
});

test('checkApkUpdate devolve null se o fetch falhar', async () => {
  assert.equal(await checkApkUpdate({ fetchImpl: () => Promise.reject(new Error('x')), baseUrl: 'https://x', local: '1.0.0', native: true }), null);
});

test('checkApkUpdate devolve a versão nova', async () => {
  const fetchImpl = async url => ({ ok: true, json: async () => ({ url, version: '1.1.0', apk: '/flechas.apk' }) });
  const r = await checkApkUpdate({ fetchImpl, baseUrl: 'https://x.web.app', local: '1.0.0', native: true });
  assert.deepEqual(r, { version: '1.1.0', apk: 'https://x.web.app/flechas.apk' });
});

test('checkApkUpdate não faz nada fora do APK ou sem versão nova', async () => {
  const fetchImpl = async () => ({ ok: true, json: async () => ({ version: '1.1.0', apk: '/flechas.apk' }) });
  assert.equal(await checkApkUpdate({ fetchImpl, baseUrl: 'https://x', local: '1.0.0', native: false }), null);
  assert.equal(await checkApkUpdate({ fetchImpl, baseUrl: 'https://x', local: '1.1.0', native: true }), null);
  assert.equal(await checkApkUpdate({ fetchImpl, baseUrl: '', local: '1.0.0', native: true }), null);
});
