// Regra do prazo offline: depois de uma verificação online bem-sucedida, a app funciona
// sem rede durante LEASE_DAYS dias. Puro, sem acesso a rede nem ao relógio.

export const LEASE_DAYS = 7;
export const CLOCK_SKEW_MS = 5 * 60 * 1000;
const LEASE_MS = LEASE_DAYS * 24 * 60 * 60 * 1000;
const KEY = 'flechas-acesso';

/** Estado de acesso.
 *  signed-out: sem sessão; ok: dentro do prazo; expired: precisa de verificar online.
 *  Um relógio mais de CLOCK_SKEW_MS antes da última verificação conta como expirado. */
export function accessStatus({ signedIn, lastVerifiedAt, now }) {
  if (!signedIn) return { state: 'signed-out', expiresAt: null };
  if (!Number.isFinite(lastVerifiedAt)) return { state: 'expired', expiresAt: null };
  const expiresAt = lastVerifiedAt + LEASE_MS;
  if (now < lastVerifiedAt - CLOCK_SKEW_MS || now > expiresAt) return { state: 'expired', expiresAt };
  return { state: 'ok', expiresAt };
}

const norm = email => String(email || '').trim().toLowerCase();

function read(storage) {
  try {
    const v = JSON.parse(storage.getItem(KEY) || 'null');
    if (v && typeof v.email === 'string' && Number.isFinite(v.lastVerifiedAt)) return v;
  } catch (e) { /* corrompido ou sem armazenamento */ }
  return null;
}

/** Última verificação guardada para este email (sem distinguir maiúsculas), ou null. */
export function loadLease(storage, email) {
  const v = read(storage);
  return v && v.email === norm(email) ? v.lastVerifiedAt : null;
}

/** Email do último prazo guardado, ou null. Serve para abrir a app sem esperar pelo Firebase. */
export function loadLeaseEmail(storage) {
  const v = read(storage);
  return v ? v.email : null;
}

export function saveLease(storage, email, at) {
  try { storage.setItem(KEY, JSON.stringify({ email: norm(email), lastVerifiedAt: at })); } catch (e) { /* sem armazenamento */ }
}

export function clearLease(storage) {
  try { storage.removeItem(KEY); } catch (e) { /* sem armazenamento */ }
}
