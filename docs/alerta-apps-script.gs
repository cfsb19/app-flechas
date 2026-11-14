// Alerta por email de pedidos de acesso à app Flechas.
// Corre na conta Google do administrador (Google Apps Script, gratuito). Ver docs/configuracao.md, secção 7.
// O URL deste script fica no código da app, por isso qualquer pessoa o pode chamar: o email só leva
// um nome limpo e um email validado, nunca texto livre nem links, e há um limite de envios.
const DESTINO = 'carlos.batista@ren.pt';
const MAX_POR_6H = 20;

function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return ContentService.createTextOutput('ocupado');
  try {
    const props = PropertiesService.getScriptProperties();
    const agora = Date.now(), janela = 6 * 3600 * 1000;
    let c = JSON.parse(props.getProperty('contador') || '{"desde":0,"n":0}');
    if (agora - c.desde > janela) c = { desde: agora, n: 0 };
    if (c.n >= MAX_POR_6H) return ContentService.createTextOutput('limite');
    c.n++; props.setProperty('contador', JSON.stringify(c));

    let d = {};
    try { d = JSON.parse(e.postData.contents); } catch (err) { /* corpo inválido */ }
    const nome = String(d.nome || '').replace(/[^\p{L}\p{M} .'-]/gu, '').trim().slice(0, 60) || '(sem nome)';
    const emailBruto = String(d.email || '').trim().slice(0, 120);
    const email = /^[^\s@<>()"',;:]+@[^\s@<>()"',;:]+\.[a-z]{2,}$/i.test(emailBruto) ? emailBruto : '(email inválido)';
    MailApp.sendEmail(DESTINO, 'Flechas: novo pedido de acesso',
      'Há um novo pedido de acesso à app Flechas.\n\n' +
      'Nome: ' + nome + '\nEmail: ' + email + '\n\n' +
      'Abre a app Flechas e vai a Administração para aprovar ou recusar. ' +
      'Aprova só pedidos com "email confirmado".');
    return ContentService.createTextOutput('ok');
  } finally {
    lock.releaseLock();
  }
}
