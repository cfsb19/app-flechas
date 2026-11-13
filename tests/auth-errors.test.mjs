import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signInErrorCode, verifyResult } from '../src/access/auth-errors.js';

test('erros de login do Firebase mapeados para os códigos da app', () => {
  for (const c of ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email'])
    assert.equal(signInErrorCode(c), 'invalid-credentials', c);
  assert.equal(signInErrorCode('auth/user-disabled'), 'disabled');
  assert.equal(signInErrorCode('auth/network-request-failed'), 'offline');
  assert.equal(signInErrorCode('auth/too-many-requests'), 'other');
  assert.equal(signInErrorCode(undefined), 'other');
});

test('verificação: só conta desativada/apagada corta o acesso', () => {
  for (const c of ['auth/user-disabled', 'auth/user-token-expired', 'auth/user-not-found', 'auth/invalid-user-token'])
    assert.equal(verifyResult(c), 'revoked', c);
});

test('verificação: erro de rede ou desconhecido nunca bloqueia', () => {
  assert.equal(verifyResult('auth/network-request-failed'), 'offline');
  assert.equal(verifyResult('auth/internal-error'), 'offline');
  assert.equal(verifyResult(undefined), 'offline');
});
