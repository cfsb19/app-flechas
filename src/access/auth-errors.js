// Tradução dos códigos de erro do Firebase Auth para os códigos da app.

const INVALID = new Set(['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email']);
const REVOKED = new Set(['auth/user-disabled', 'auth/user-token-expired', 'auth/user-not-found', 'auth/invalid-user-token']);

/** 'invalid-credentials' | 'disabled' | 'offline' | 'other' */
export function signInErrorCode(code) {
  if (INVALID.has(code)) return 'invalid-credentials';
  if (code === 'auth/user-disabled') return 'disabled';
  if (code === 'auth/network-request-failed') return 'offline';
  return 'other';
}

/** Resultado de uma verificação falhada. Só uma conta desativada ou apagada corta o acesso;
 *  qualquer outro erro conta como "sem rede", para nunca bloquear ninguém no terreno por engano. */
export function verifyResult(code) {
  return REVOKED.has(code) ? 'revoked' : 'offline';
}
