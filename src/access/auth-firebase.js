// Adaptador de autenticação com Firebase Auth (email e palavra-passe).
import { initializeApp } from 'firebase/app';
import {
  initializeAuth, indexedDBLocalPersistence, browserLocalPersistence,
  signInWithEmailAndPassword, signOut, sendPasswordResetEmail,
  createUserWithEmailAndPassword, updateProfile,
} from 'firebase/auth';
import {
  initializeFirestore, doc, collection, setDoc, updateDoc, getDocFromServer, getDocsFromServer,
  query, limit, serverTimestamp,
} from 'firebase/firestore';
import { firebaseConfig } from './firebase-config.js';
import { signInErrorCode, verifyResult, signUpErrorCode } from './auth-errors.js';

function fail(code) { const e = new Error(code); e.code = code; return e; }

export function createAuth() {
  if (Object.values(firebaseConfig).some(v => !v || v === 'PREENCHER'))
    throw new Error('Configuração do Firebase em falta (ver docs/configuracao.md).');
  const app = initializeApp(firebaseConfig);
  // initializeAuth em vez de getAuth: evita o resolver de popups, que falha no WebView do Capacitor.
  const auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });
  auth.languageCode = 'pt';
  // Firestore só guarda os pedidos de acesso (nome, email, estado). As medições nunca vão para lá.
  const db = initializeFirestore(app, {});
  const pedido = u => ({ email: u.email, nome: (u.displayName || u.email || '').slice(0, 80), estado: 'pendente', pedidoEm: serverTimestamp() });
  let adminCache = null;
  /** Só o administrador (definido nas regras do Firestore) consegue listar a coleção. */
  async function isAdmin() {
    const u = auth.currentUser; if (!u) return false;
    if (adminCache && adminCache.uid === u.uid) return adminCache.v;
    try { await getDocsFromServer(query(collection(db, 'acessos'), limit(1))); adminCache = { uid: u.uid, v: true }; return true; }
    catch (e) { if (e && e.code === 'permission-denied') adminCache = { uid: u.uid, v: false }; return false; }
  }

  return {
    async currentUser() {
      await auth.authStateReady();
      return auth.currentUser ? { email: auth.currentUser.email } : null;
    },
    async signIn(email, password) {
      try { await signInWithEmailAndPassword(auth, email, password); }
      catch (e) { throw fail(signInErrorCode(e && e.code)); }
    },
    async signUp(nome, email, password) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: String(nome || '').slice(0, 80) });
        try { await setDoc(doc(db, 'acessos', cred.user.uid), pedido(cred.user)); }
        catch (e) { /* sem rede: o pedido é criado na próxima verificação (estadoAcesso) */ }
      } catch (e) { throw fail(signUpErrorCode(e && e.code)); }
    },
    async signOut() { adminCache = null; await signOut(auth); },
    async resetPassword(email) {
      try { await sendPasswordResetEmail(auth, email); }
      catch (e) {
        const c = signInErrorCode(e && e.code);
        // Não revelar se o email existe: só a falta de rede é reportada.
        if (c === 'offline') throw fail('offline');
      }
    },
    isAdmin,
    /** 'aprovado' | 'pendente' | 'recusado' | 'offline'. Conta sem pedido (criada na consola): cria-o pendente. */
    async estadoAcesso() {
      const u = auth.currentUser; if (!u) return 'recusado';
      try {
        if (await isAdmin()) return 'aprovado';
        const ref = doc(db, 'acessos', u.uid);
        const snap = await getDocFromServer(ref);
        if (!snap.exists()) { await setDoc(ref, pedido(u)); return 'pendente'; }
        const e = snap.data().estado;
        return e === 'aprovado' ? 'aprovado' : e === 'pendente' ? 'pendente' : 'recusado';
      } catch (e) { return 'offline'; } // rede, permissões ou Firestore indisponível: nunca bloqueia quem está no prazo
    },
    async listarAcessos() {
      const snap = await getDocsFromServer(collection(db, 'acessos'));
      return snap.docs.map(d => ({ uid: d.id, ...d.data(), pedidoEm: d.data().pedidoEm ? d.data().pedidoEm.toDate() : null }));
    },
    async decidir(uid, estado) { await updateDoc(doc(db, 'acessos', uid), { estado, decididoEm: serverTimestamp() }); },
    async verify() {
      const u = auth.currentUser;
      if (!u) return 'revoked';
      try { await u.getIdToken(true); return 'ok'; }
      catch (e) { return verifyResult(e && e.code); }
    },
  };
}
