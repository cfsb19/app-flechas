// Adaptador falso para os testes e2e (só entra no build com VITE_AUTH=fake).
// Estado em localStorage['fake-auth'] = { users: { email: { password, disabled } }, session: email|null }.
const KEY = 'fake-auth';
const read = () => JSON.parse(localStorage.getItem(KEY) || '{"users":{},"session":null}');
const write = d => localStorage.setItem(KEY, JSON.stringify(d));
function fail(code) { const e = new Error(code); e.code = code; return e; }

export function createAuth() {
  return {
    async currentUser() { const d = read(); return d.session ? { email: d.session } : null; },
    async signIn(email, password) {
      if (!navigator.onLine) throw fail('offline');
      const d = read(), u = d.users[email];
      if (!u || u.password !== password) throw fail('invalid-credentials');
      if (u.disabled) throw fail('disabled');
      d.session = email; write(d);
    },
    async signOut() { const d = read(); d.session = null; write(d); },
    async resetPassword() { if (!navigator.onLine) throw fail('offline'); },
    async verify() {
      if (!navigator.onLine) return 'offline';
      const d = read(), u = d.users[d.session];
      return !u || u.disabled ? 'revoked' : 'ok';
    },
  };
}
