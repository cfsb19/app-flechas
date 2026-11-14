import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enviarAlerta } from '../src/access/alerta.js';

test('sem URL não envia', async () => {
  let chamado = false;
  assert.equal(await enviarAlerta({ nome: 'Ana', email: 'a@x.pt' }, { url: '', fetchImpl: async () => { chamado = true; } }), false);
  assert.equal(chamado, false);
});

test('envia POST text/plain no-cors com nome e email', async () => {
  let args;
  const ok = await enviarAlerta({ nome: 'Ana', email: 'a@x.pt' }, { url: 'https://script.google.com/x', fetchImpl: async (...a) => { args = a; return {}; } });
  assert.equal(ok, true);
  assert.equal(args[0], 'https://script.google.com/x');
  assert.equal(args[1].method, 'POST');
  assert.equal(args[1].mode, 'no-cors');
  assert.equal(args[1].headers['Content-Type'], 'text/plain;charset=utf-8');
  assert.deepEqual(JSON.parse(args[1].body), { nome: 'Ana', email: 'a@x.pt' });
});

test('erro de rede devolve false sem lançar', async () => {
  assert.equal(await enviarAlerta({ nome: 'Ana', email: 'a@x.pt' }, { url: 'https://x', fetchImpl: async () => { throw new Error('rede'); } }), false);
});
