import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow-semi-condensed/500.css';
import '@fontsource/barlow-semi-condensed/600.css';
import '@fontsource/barlow-semi-condensed/700.css';
import './styles.css';
import { mountCalc } from './calc/app.js';
import { initPwa, banner } from './pwa.js';
import { checkApkUpdate } from './update/check.js';
import { startGate } from './access/gate.js';
import { openHistory } from './history/store.js';
import { mountHistory } from './history/ui.js';

async function loadAuth() {
  const mod = import.meta.env.VITE_AUTH === 'fake'
    ? await import('./access/auth-fake.js')
    : await import('./access/auth-firebase.js');
  return mod.createAuth();
}

initPwa();

// APK Android: avisar quando houver versão nova no alojamento.
checkApkUpdate().then(u => {
  if (u) banner('apk-update', `Há uma versão nova da app (${u.version}).`, 'Descarregar', () => window.open(u.apk, '_blank'));
});

async function mountApp() {
  let hist = null;
  const calc = mountCalc(document.getElementById('calc'), { onRender: () => hist && hist.onRender() });
  hist = mountHistory({ calc, history: await openHistory() });
}

loadAuth().then(auth => {
  startGate({ auth, onUnlock: () => { mountApp(); } });
}).catch(err => {
  document.getElementById('login').hidden = false;
  document.getElementById('login-msg').textContent = err.message;
  document.getElementById('login-go').disabled = true;
});
