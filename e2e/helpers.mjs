// Sessão falsa (build em modo e2e usa src/access/auth-fake.js).
export const USERS = { 'ana@x.pt': { password: 'segredo1', disabled: false } };

export function seed(page, data) {
  return page.addInitScript(d => localStorage.setItem('fake-auth', JSON.stringify(d)), data);
}

export function seedLease(page, email, ageMs) {
  return page.addInitScript(([e, a]) => localStorage.setItem('flechas-acesso', JSON.stringify({ email: e, lastVerifiedAt: Date.now() - a })), [email, ageMs]);
}

/** Utilizador com sessão aberta e acesso confirmado há 1 hora. */
export async function signedIn(page) {
  await seed(page, { users: USERS, session: 'ana@x.pt' });
  await seedLease(page, 'ana@x.pt', 3600000);
}
