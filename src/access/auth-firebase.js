// Adaptador de autenticação com Firebase Auth (email e palavra-passe).
import { initializeApp } from 'firebase/app';
import {
  initializeAuth, indexedDBLocalPersistence, browserLocalPersistence,
  signInWithEmailAndPassword, signOut, sendPasswordResetEmail,
} from 'firebase/auth';
import { firebaseConfig } from './firebase-config.js';
import { signInErrorCode, verifyResult } from './auth-errors.js';

function fail(code) { const e = new Error(code); e.code = code; return e; }

export function createAuth() {
  if (Object.values(firebaseConfig).some(v => !v || v === 'PREENCHER'))
    throw new Error('Configuração do Firebase em falta (ver docs/configuracao.md).');
  const app = initializeApp(firebaseConfig);
  // initializeAuth em vez de getAuth: evita o resolver de popups, que falha no WebView do Capacitor.
  const auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });
  auth.languageCode = 'pt';

  return {
    async currentUser() {
      await auth.authStateReady();
      return auth.currentUser ? { email: auth.currentUser.email } : null;
    },
    async signIn(email, password) {
      try { await signInWithEmailAndPassword(auth, email, password); }
      catch (e) { throw fail(signInErrorCode(e && e.code)); }
    },
    async signOut() { await signOut(auth); },
    async resetPassword(email) {
      try { await sendPasswordResetEmail(auth, email); }
      catch (e) {
        const c = signInErrorCode(e && e.code);
        // Não revelar se o email existe: só a falta de rede é reportada.
        if (c === 'offline') throw fail('offline');
      }
    },
    async verify() {
      const u = auth.currentUser;
      if (!u) return 'revoked';
      try { await u.getIdToken(true); return 'ok'; }
      catch (e) { return verifyResult(e && e.code); }
    },
  };
}
