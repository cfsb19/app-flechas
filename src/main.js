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

async function loadAuth() {
  const mod = import.meta.env.VITE_AUTH === 'fake'
    ? await import('./access/auth-fake.js')
    : await import('./access/auth-firebase.js');
  return mod.createAuth();
}

initPwa();

let calc = null;
loadAuth().then(auth => {
  startGate({ auth, onUnlock: () => { calc = mountCalc(document.getElementById('calc')); } });
}).catch(err => {
  document.getElementById('login').hidden = false;
  document.getElementById('login-msg').textContent = err.message;
  document.getElementById('login-go').disabled = true;
});
