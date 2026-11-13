import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow-semi-condensed/500.css';
import '@fontsource/barlow-semi-condensed/600.css';
import '@fontsource/barlow-semi-condensed/700.css';
import './styles.css';
import { mountCalc } from './calc/app.js';
import { initPwa } from './pwa.js';
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
