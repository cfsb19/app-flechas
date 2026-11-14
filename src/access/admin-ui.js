// Administração dos pedidos de acesso (só para o administrador definido nas regras do Firestore).

const GRUPOS = {
  pendente: { lista: 'admin-pendentes', vazio: 'Sem pedidos pendentes.', acoes: [['Aprovar', 'aprovado'], ['Recusar', 'recusado']] },
  aprovado: { lista: 'admin-aprovados', vazio: 'Ninguém com acesso.', acoes: [['Retirar acesso', 'recusado']] },
  recusado: { lista: 'admin-recusados', vazio: '—', acoes: [['Aprovar', 'aprovado']] },
};
const dataPt = d => (d instanceof Date && !isNaN(d) ? d.toLocaleDateString('pt-PT') : '');

/** Mostra "Administração" e a faixa de pendentes se o utilizador for o administrador. */
export async function mountAdmin({ auth, banner }) {
  if (!auth.isAdmin || !(await auth.isAdmin())) return null;
  const $ = id => document.getElementById(id);
  const msg = (t = '', err = false) => { $('admin-msg').textContent = t; $('admin-msg').classList.toggle('info', !err); };
  $('admin-abrir').hidden = false;

  function render(lista) {
    for (const [estado, g] of Object.entries(GRUPOS)) {
      const ul = $(g.lista); ul.textContent = '';
      const itens = lista.filter(a => (a.estado === estado) || (estado === 'recusado' && !GRUPOS[a.estado]));
      if (!itens.length) { const li = document.createElement('li'); li.className = 'admin-vazio'; li.textContent = g.vazio; ul.append(li); continue; }
      for (const a of itens) {
        const li = document.createElement('li');
        const main = document.createElement('span'); main.className = 'hist-main';
        main.textContent = `${a.nome || '—'} · ${a.email || ''}`;
        const w = document.createElement('span'); w.className = 'hist-when'; w.textContent = dataPt(a.pedidoEm);
        const btns = document.createElement('span'); btns.className = 'hist-btns';
        for (const [rotulo, novo] of g.acoes) {
          const b = document.createElement('button'); b.type = 'button'; b.className = 'link'; b.textContent = rotulo;
          b.addEventListener('click', async () => {
            b.disabled = true;
            try { await auth.decidir(a.uid, novo); msg(`${a.email}: ${novo === 'aprovado' ? 'acesso aprovado' : 'acesso recusado'}.`); }
            catch (e) { msg('Não foi possível guardar a decisão. Verifica a ligação e tenta outra vez.', true); }
            await carregar();
          });
          btns.append(b);
        }
        li.append(main, w, btns); ul.append(li);
      }
    }
  }
  async function carregar() {
    let lista = [];
    try { lista = await auth.listarAcessos(); }
    catch (e) { msg('Não foi possível carregar os pedidos. Verifica a ligação.', true); }
    render(lista);
    return lista;
  }
  async function abrir() { msg(); await carregar(); if (!$('admin').open) $('admin').showModal(); }
  $('admin-abrir').addEventListener('click', abrir);
  $('admin-fechar').addEventListener('click', () => $('admin').close());

  const lista = await carregar();
  const n = lista.filter(a => a.estado === 'pendente').length;
  if (n) banner('admin-faixa', `${n} ${n === 1 ? 'pedido de acesso pendente' : 'pedidos de acesso pendentes'}.`, 'Ver', el => { el.remove(); abrir(); });
  return { abrir, carregar };
}
