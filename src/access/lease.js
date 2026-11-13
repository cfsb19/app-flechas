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

/** Última verificação guardada para este email, ou null. */
export function loadLease(storage, email) {
  try {
    const v = JSON.parse(storage.getItem(KEY) || 'null');
    if (v && v.email === email && Number.isFinite(v.lastVerifiedAt)) return v.lastVerifiedAt;
  } catch (e) { /* corrompido ou sem armazenamento */ }
  return null;
}

export function saveLease(storage, email, at) {
  try { storage.setItem(KEY, JSON.stringify({ email, lastVerifiedAt: at })); } catch (e) { /* sem armazenamento */ }
}

export function clearLease(storage) {
  try { storage.removeItem(KEY); } catch (e) { /* sem armazenamento */ }
}
