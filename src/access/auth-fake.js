// Adaptador falso para os testes e2e (só entra no build com VITE_AUTH=fake).
// Estado em localStorage['fake-auth'] = {
//   users: { email: { password, disabled?, nome?, estado?: 'pendente'|'aprovado'|'recusado', semPedido? } },
//   session: email|null, admin?: email, currentUserDelayMs?, verifyDelayMs? }
// Sem `estado` o utilizador conta como aprovado (contas dos testes antigos); `semPedido` simula uma conta
// criada na consola, ainda sem pedido de acesso.
const KEY = 'fake-auth';
const read = () => JSON.parse(localStorage.getItem(KEY) || '{"users":{},"session":null}');
const write = d => localStorage.setItem(KEY, JSON.stringify(d));
const sleep = ms => new Promise(r => setTimeout(r, ms || 0));
function fail(code) { const e = new Error(code); e.code = code; return e; }

export function createAuth() {
  return {
    async currentUser() { const d0 = read(); await sleep(d0.currentUserDelayMs); const d = read(); return d.session ? { email: d.session } : null; },
    async signIn(email, password) {
      if (!navigator.onLine) throw fail('offline');
      const d = read(), u = d.users[email];
      if (!u || u.password !== password) throw fail('invalid-credentials');
      if (u.disabled) throw fail('disabled');
      d.session = email; write(d);
    },
    async signUp(nome, email, password) {
      if (!navigator.onLine) throw fail('offline');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw fail('invalid-email');
      if (String(password).length < 6) throw fail('weak-password');
      const d = read();
      if (d.users[email]) throw fail('email-in-use');
      d.users[email] = { password, nome, estado: 'pendente' }; d.session = email; write(d);
    },
    async signOut() { const d = read(); d.session = null; write(d); },
    async resetPassword() { if (!navigator.onLine) throw fail('offline'); },
    async verify() {
      await sleep(read().verifyDelayMs);
      if (!navigator.onLine) return 'offline';
      const d = read(), u = d.users[d.session];
      return !u || u.disabled ? 'revoked' : 'ok';
    },
    async estadoAcesso() {
      if (!navigator.onLine) return 'offline';
      const d = read(), u = d.users[d.session];
      if (!u) return 'recusado';
      if (d.estadoErro) return 'offline'; // simula Firestore indisponível (rede, proxy, permissões)
      if (d.session === d.admin) return 'aprovado';
      if (u.semPedido) { delete u.semPedido; u.estado = 'pendente'; write(d); }
      return u.estado || 'aprovado';
    },
    async isAdmin() { const d = read(); return navigator.onLine && !!d.session && d.session === d.admin; },
    async listarAcessos() {
      const d = read();
      if (d.session !== d.admin) throw fail('permission-denied');
      return Object.entries(d.users).filter(([e]) => e !== d.admin)
        .map(([email, u]) => ({ uid: email, email, nome: u.nome || email, estado: u.estado || 'aprovado', emailVerificado: !!u.emailVerificado, pedidoEm: null }));
    },
    async decidir(uid, estado) {
      const d = read();
      if (d.session !== d.admin) throw fail('permission-denied');
      d.users[uid].estado = estado; write(d);
    },
  };
}
