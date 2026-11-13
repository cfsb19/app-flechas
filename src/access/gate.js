// Porta de acesso: login, verificação online e prazo offline.
import { accessStatus, loadLease, saveLease, clearLease } from './lease.js';

export const MSG = {
  'invalid-credentials': 'Email ou palavra-passe errados.',
  disabled: 'A tua conta foi desativada. Fala com o administrador.',
  offline: 'Para entrar precisas de internet.',
  other: 'Não foi possível entrar. Tenta outra vez.',
  reset: 'Se o email existir, vais receber um link para definir a palavra-passe.',
  noEmail: 'Escreve o teu email primeiro.',
  stillOffline: 'Ainda sem ligação. Tenta outra vez quando tiveres rede.',
};

const VERIFY_TIMEOUT_MS = 10000;
const RECHECK_MS = 6 * 60 * 60 * 1000;
const dateFmt = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const withTimeout = (p, ms, fallback) =>
  Promise.race([p, new Promise(r => setTimeout(() => r(fallback), ms))]).catch(() => fallback);

export function startGate({ auth, storage = localStorage, now = Date.now, onUnlock, doc = document }) {
  const $ = id => doc.getElementById(id);
  let unlocked = false, busy = false;

  function show(which, msg = '', info = false) {
    $('login').hidden = which !== 'login';
    $('locked').hidden = which !== 'locked';
    $('calc').hidden = which !== 'app';
    $('account').hidden = which !== 'app';
    const m = which === 'login' ? $('login-msg') : which === 'locked' ? $('locked-msg') : null;
    if (m) { m.textContent = msg; m.classList.toggle('info', info); }
  }

  function unlock(user, expiresAt) {
    $('account-email').textContent = user.email;
    $('account-until').textContent = 'Acesso confirmado até ' + dateFmt.format(new Date(expiresAt));
    show('app');
    if (!unlocked) { unlocked = true; onUnlock(); }
  }

  async function evaluate({ verifyNow, lockedMsg = '' }) {
    const user = await auth.currentUser();
    if (!user) { show('login'); return; }
    if (verifyNow && navigator.onLine) {
      const r = await withTimeout(auth.verify(), VERIFY_TIMEOUT_MS, 'offline');
      if (r === 'ok') saveLease(storage, user.email, now());
      else if (r === 'revoked') {
        await auth.signOut(); clearLease(storage);
        show('login', MSG.disabled); return;
      }
    }
    const st = accessStatus({ signedIn: true, lastVerifiedAt: loadLease(storage, user.email), now: now() });
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
      saveLease(storage, email, now()); // o login bem-sucedido é uma verificação online
      $('login-pass').value = '';
      await evaluate({ verifyNow: false });
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
