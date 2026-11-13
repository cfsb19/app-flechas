import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accessStatus, loadLease, loadLeaseEmail, saveLease, clearLease, LEASE_DAYS, CLOCK_SKEW_MS } from '../src/access/lease.js';

const D = 86400000, t0 = Date.UTC(2026, 10, 13);
const memStorage = () => { const s = new Map(); return { getItem: k => s.get(k) ?? null, setItem: (k, v) => s.set(k, String(v)), removeItem: k => s.delete(k) }; };

test('prazo de 7 dias', () => assert.equal(LEASE_DAYS, 7));
test('sem sessão', () => assert.equal(accessStatus({ signedIn: false, lastVerifiedAt: t0, now: t0 }).state, 'signed-out'));
test('nunca verificado', () => assert.equal(accessStatus({ signedIn: true, lastVerifiedAt: null, now: t0 }).state, 'expired'));
test('dentro do prazo', () => {
  const r = accessStatus({ signedIn: true, lastVerifiedAt: t0, now: t0 + 7 * D - 1 });
  assert.equal(r.state, 'ok'); assert.equal(r.expiresAt, t0 + 7 * D);
});
test('prazo esgotado', () => assert.equal(accessStatus({ signedIn: true, lastVerifiedAt: t0, now: t0 + 7 * D + 1 }).state, 'expired'));
test('relógio atrasado mais de 5 min conta como expirado', () =>
  assert.equal(accessStatus({ signedIn: true, lastVerifiedAt: t0, now: t0 - CLOCK_SKEW_MS - 1 }).state, 'expired'));
test('relógio atrasado menos de 5 min é tolerado', () =>
  assert.equal(accessStatus({ signedIn: true, lastVerifiedAt: t0, now: t0 - 1000 }).state, 'ok'));
test('prazo guardado é por email', () => {
  const st = memStorage();
  saveLease(st, 'a@x.pt', t0);
  assert.equal(loadLease(st, 'a@x.pt'), t0);
  assert.equal(loadLease(st, 'b@x.pt'), null);
  clearLease(st);
  assert.equal(loadLease(st, 'a@x.pt'), null);
});
test('prazo guardado corrompido conta como inexistente', () => {
  const st = memStorage(); st.setItem('flechas-acesso', '{lixo');
  assert.equal(loadLease(st, 'a@x.pt'), null);
});

test('prazo ignora maiúsculas no email (o Firebase devolve o email em minúsculas)', () => {
  const st = memStorage();
  saveLease(st, 'Ana@X.pt', t0);
  assert.equal(loadLease(st, 'ana@x.pt'), t0);
});

test('loadLeaseEmail devolve o email do último prazo guardado', () => {
  const st = memStorage();
  assert.equal(loadLeaseEmail(st), null);
  saveLease(st, 'Ana@X.pt', t0);
  assert.equal(loadLeaseEmail(st), 'ana@x.pt');
});
