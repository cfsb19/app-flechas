// Porta de acesso: login, verificação online e prazo offline.
import { accessStatus, loadLease, loadLeaseEmail, saveLease, clearLease } from './lease.js';
import { enviarAlerta } from './alerta.js';

export const MSG = {
  'invalid-credentials': 'Email ou palavra-passe errados.',
  disabled: 'A tua conta foi desativada. Fala com o administrador.',
  offline: 'Para entrar precisas de internet.',
  other: 'Não foi possível entrar. Tenta outra vez.',
  reset: 'Se o email existir, vais receber um link para definir a palavra-passe.',
  noEmail: 'Escreve o teu email primeiro.',
  stillOffline: 'Ainda sem ligação. Tenta outra vez quando tiveres rede.',
  recusado: 'O teu acesso à app foi recusado ou retirado. Fala com o administrador.',
  aindaPendente: 'Ainda não foi aprovado.',
  'email-in-use': 'Já existe uma conta com este email. Entra com a tua palavra-passe ou usa "Esqueci-me da palavra-passe".',
  'weak-password': 'A palavra-passe tem de ter pelo menos 6 caracteres.',
  'invalid-email': 'O email não é válido.',
  semNome: 'Escreve o teu nome.',
};

const VERIFY_TIMEOUT_MS = 10000;
const USER_WAIT_MS = 3000; // com rede fraca o Firebase pode demorar até ~60 s a restaurar a sessão
const PENDING = Symbol('pending');
const RECHECK_MS = 6 * 60 * 60 * 1000;
const dateFmt = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const withTimeout = (p, ms, fallback) =>
  Promise.race([p, new Promise(r => setTimeout(() => r(fallback), ms))]).catch(() => fallback);

export function startGate({ auth, storage = localStorage, now = Date.now, onUnlock, doc = document }) {
  const $ = id => doc.getElementById(id);
  let unlocked = false, busy = false;

  function show(which, msg = '', info = false) {
    $('checking').hidden = true;
    for (const s of ['login', 'locked', 'pedido', 'pendente']) $(s).hidden = which !== s;
    $('app').hidden = which !== 'app';
    const m = { login: 'login-msg', locked: 'locked-msg', pedido: 'pedido-msg', pendente: 'pendente-msg' }[which];
    if (m) { $(m).textContent = msg; $(m).classList.toggle('info', info); }
  }

  function unlock(user, expiresAt) {
    $('account-email').textContent = user.email;
    $('account-until').textContent = 'Acesso confirmado até ' + dateFmt.format(new Date(expiresAt));
    show('app');
    if (!unlocked) { unlocked = true; onUnlock(); }
  }

  const leaseStatus = email => accessStatus({ signedIn: true, lastVerifiedAt: loadLease(storage, email), now: now() });

  /** Pedido de acesso: 'aprovado' grava o prazo; 'pendente' e 'recusado' tiram o acesso; 'offline' não muda nada. */
  async function aplicarEstado(user, { pendMsg = '' } = {}) {
    const e = await withTimeout(auth.estadoAcesso(), VERIFY_TIMEOUT_MS, 'offline');
    if (e === 'aprovado') { saveLease(storage, user.email, now()); return true; }
    if (e === 'pendente') { clearLease(storage); $('pendente-email').textContent = user.email; show('pendente', pendMsg); return false; }
    if (e === 'recusado') { await auth.signOut(); clearLease(storage); show('login', MSG.recusado); return false; }
    return true; // sem rede: aplica-se o prazo offline
  }

  async function evaluate({ verifyNow, lockedMsg = '', pendMsg = '' }) {
    // Não esperar pelo servidor para abrir: se o prazo guardado está válido, a calculadora abre já
    // e a verificação continua em segundo plano.
    const userP = auth.currentUser();
    let user = await withTimeout(userP, USER_WAIT_MS, PENDING);
    if (user === PENDING) {
      const email = loadLeaseEmail(storage);
      const st = email ? leaseStatus(email) : null;
      if (st && st.state === 'ok') unlock({ email }, st.expiresAt);
      user = await userP.catch(() => null);
    }
    if (!user) { show('login'); return; }

    let st = leaseStatus(user.email);
    if (st.state === 'ok') unlock(user, st.expiresAt);

    if (verifyNow && navigator.onLine) {
      const r = await withTimeout(auth.verify(), VERIFY_TIMEOUT_MS, 'offline');
      if (r === 'ok') { if (!(await aplicarEstado(user, { pendMsg }))) return; }
      else if (r === 'revoked') {
        await auth.signOut(); clearLease(storage);
        show('login', MSG.disabled); return;
      }
    }
    st = leaseStatus(user.email);
    if (st.state === 'ok') unlock(user, st.expiresAt);
    else show('locked', lockedMsg);
  }

  $('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    if (busy) return;
    const email = $('login-email').value.trim(), pass = $('login-pass').value;
    busy = true; $('login-go').disabled = true;
    try {
      await auth.signIn(email, pass);
      $('login-pass').value = '';
      // o login bem-sucedido é uma verificação online; falta confirmar o pedido de acesso
      const user = (await auth.currentUser()) || { email };
      if (await aplicarEstado(user)) await evaluate({ verifyNow: false });
    } catch (err) {
      show('login', MSG[err && err.code] || MSG.other);
    } finally { busy = false; $('login-go').disabled = false; }
  });

  $('login-reset').addEventListener('click', async () => {
    const email = $('login-email').value.trim();
    if (!email) { show('login', MSG.noEmail); return; }
    try { await auth.resetPassword(email); show('login', MSG.reset, true); }
    catch (err) { show('login', MSG[err && err.code] || MSG.other); }
  });

  $('pedir-abrir').addEventListener('click', () => { $('pedido-email').value = $('login-email').value.trim(); show('pedido'); $('pedido-nome').focus(); });
  $('pedido-voltar').addEventListener('click', () => show('login'));
  $('pedido-form').addEventListener('submit', async e => {
    e.preventDefault();
    if (busy) return;
    const nome = $('pedido-nome').value.trim(), email = $('pedido-email').value.trim(), pass = $('pedido-pass').value;
    if (!nome) { show('pedido', MSG.semNome); return; }
    busy = true; $('pedido-go').disabled = true;
    try {
      await auth.signUp(nome, email, pass);
      $('pedido-pass').value = '';
      enviarAlerta({ nome, email }); // não espera: o pedido já ficou registado
      $('pendente-email').textContent = email;
      show('pendente');
    } catch (err) {
      show('pedido', MSG[err && err.code] || MSG.other);
    } finally { busy = false; $('pedido-go').disabled = false; }
  });
  $('pendente-verificar').addEventListener('click', () => evaluate({ verifyNow: true, pendMsg: MSG.aindaPendente }));
  $('pendente-sair').addEventListener('click', async () => { await auth.signOut(); clearLease(storage); show('login'); });

  $('locked-retry').addEventListener('click', () =>
    evaluate({ verifyNow: true, lockedMsg: MSG.stillOffline }));

  $('account-logout').addEventListener('click', async () => {
    await auth.signOut(); clearLease(storage); show('login');
  });

  const recheck = () => { if (!busy) evaluate({ verifyNow: true }).catch(() => {}); };
  window.addEventListener('online', recheck);
  doc.addEventListener('visibilitychange', () => { if (doc.visibilityState === 'visible') recheck(); });
  setInterval(recheck, RECHECK_MS);

  evaluate({ verifyNow: true }).catch(() => show('login', MSG.other));
}
