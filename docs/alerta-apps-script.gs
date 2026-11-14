// Alerta por email de pedidos de acesso à app Flechas.
// Corre na conta Google do administrador (Google Apps Script, gratuito). Ver docs/configuracao.md, secção 7.
const DESTINO = 'carlos.batista@ren.pt';
const MAX_POR_6H = 30; // proteção contra abuso: no máximo 30 emails a cada 6 horas

function doPost(e) {
  const cache = CacheService.getScriptCache();
  const n = Number(cache.get('n') || 0);
  if (n >= MAX_POR_6H) return ContentService.createTextOutput('limite');
  cache.put('n', String(n + 1), 21600);
  let d = {};
  try { d = JSON.parse(e.postData.contents); } catch (err) { /* corpo inválido */ }
  const nome = String(d.nome || '').slice(0, 80);
  const email = String(d.email || '').slice(0, 120);
  MailApp.sendEmail(DESTINO, 'Flechas: novo pedido de acesso',
    'Há um novo pedido de acesso à app Flechas.\n\n' +
    'Nome: ' + nome + '\nEmail: ' + email + '\n\n' +
    'Aprova ou recusa na app: https://flechas-cabos.web.app → Administração.');
  return ContentService.createTextOutput('ok');
}
