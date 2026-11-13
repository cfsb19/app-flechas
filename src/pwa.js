// Service worker (offline), aviso de versão nova e dica de instalação no iPhone.
import { registerSW } from 'virtual:pwa-register';

const IOS_TIP_KEY = 'flechas-dica-ios-fechada';

function banner(id, text, actionLabel, onAction) {
  let el = document.getElementById(id);
  if (el) return el;
  el = document.createElement('div');
  el.id = id;
  el.className = 'banner';
  el.setAttribute('role', 'status');
  const p = document.createElement('span'); p.textContent = text; el.append(p);
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'banner-btn'; btn.textContent = actionLabel;
  btn.addEventListener('click', () => onAction(el));
  el.append(btn);
  document.body.append(el);
  return el;
}

function isIosSafariBrowser() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return ios && !navigator.standalone && !matchMedia('(display-mode: standalone)').matches;
}

export function initPwa() {
  if ('serviceWorker' in navigator && !(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())) {
    const updateSW = registerSW({
      onNeedRefresh() {
        // Nunca recarregar sozinho: pode haver uma medição a meio.
        banner('pwa-update', 'Há uma versão nova da app.', 'Atualizar', () => updateSW(true));
      },
    });
  }
  try {
    if (isIosSafariBrowser() && !localStorage.getItem(IOS_TIP_KEY)) {
      banner('ios-tip', 'Para instalar: toca em Partilhar e depois em Adicionar ao ecrã principal.', 'Fechar', el => {
        try { localStorage.setItem(IOS_TIP_KEY, '1'); } catch (e) { /* sem armazenamento */ }
        el.remove();
      });
    }
  } catch (e) { /* localStorage bloqueado: sem dica */ }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}
