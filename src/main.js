import '@fontsource/barlow/latin-400.css';
import '@fontsource/barlow/latin-500.css';
import '@fontsource/barlow/latin-600.css';
import '@fontsource/barlow-semi-condensed/latin-500.css';
import '@fontsource/barlow-semi-condensed/latin-600.css';
import '@fontsource/barlow-semi-condensed/latin-700.css';
import './styles.css';
import { mountCalc } from './calc/app.js';
import { initPwa, banner } from './pwa.js';
import { checkApkUpdate } from './update/check.js';
import { startGate } from './access/gate.js';
import { openHistory } from './history/store.js';
import { mountHistory } from './history/ui.js';
import { mountBoletim } from './boletim/ui.js';

async function loadAuth() {
  const mod = import.meta.env.VITE_AUTH === 'fake'
    ? await import('./access/auth-fake.js')
    : await import('./access/auth-firebase.js');
  return mod.createAuth();
}

const LOCAL = import.meta.env.VITE_AUTH === 'none'; // cópia num único ficheiro HTML, sem login

if (!LOCAL) initPwa();

// APK Android: avisar quando houver versão nova no alojamento.
checkApkUpdate().then(u => {
  if (u) banner('apk-update', `Há uma versão nova da app (${u.version}).`, 'Descarregar', () => window.open(u.apk, '_blank'));
});

const VISTA = 'flechas-vista';

function setVista(v) {
  const boletim = v === 'boletim';
  document.getElementById('calc').hidden = boletim;
  document.getElementById('boletim').hidden = !boletim;
  document.getElementById('vista-cabo').setAttribute('aria-pressed', String(!boletim));
  document.getElementById('vista-boletim').setAttribute('aria-pressed', String(boletim));
  try { localStorage.setItem(VISTA, boletim ? 'boletim' : 'cabo'); } catch (e) { /* sem armazenamento */ }
}

async function mountApp() {
  let hist = null;
  const calc = mountCalc(document.getElementById('calc'), { onRender: () => hist && hist.onRender() });
  const boletim = mountBoletim(document.getElementById('boletim'), { onChange: () => hist && hist.onRender() });
  document.getElementById('vista-cabo').addEventListener('click', () => setVista('cabo'));
  document.getElementById('vista-boletim').addEventListener('click', () => setVista('boletim'));
  let v = 'cabo'; try { v = localStorage.getItem(VISTA) || 'cabo'; } catch (e) { /* sem armazenamento */ }
  setVista(v);
  hist = mountHistory({ calc, boletim, history: await openHistory(), setVista });
}

if (LOCAL) {
  document.getElementById('checking').hidden = true;
  document.getElementById('app').hidden = false;
  document.getElementById('account-email').textContent = 'Versão local (sem login)';
  document.getElementById('account-until').textContent = 'Os dados ficam só neste aparelho e neste browser.';
  document.getElementById('account-logout').hidden = true;
  mountApp();
} else {
  loadAuth().then(auth => {
    startGate({ auth, onUnlock: () => { mountApp(); } });
  }).catch(err => {
    document.getElementById('login').hidden = false;
    document.getElementById('login-msg').textContent = err.message;
    document.getElementById('login-go').disabled = true;
  });
}
