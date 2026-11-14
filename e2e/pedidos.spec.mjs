import { test, expect } from '@playwright/test';
import { seed, seedOnce, ADMIN } from './helpers.mjs';

const base = () => ({ users: { [ADMIN]: { password: 'admin123' } }, session: null, admin: ADMIN });

async function pedir(page, nome, email, pass) {
  await page.click('#pedir-abrir');
  await page.fill('#pedido-nome', nome); await page.fill('#pedido-email', email); await page.fill('#pedido-pass', pass);
  await page.click('#pedido-go');
}

test('pedir acesso mostra o ecrã de espera', async ({ page }) => {
  await seedOnce(page, base()); await page.goto('/');
  await pedir(page, 'Rui Sousa', 'rui@x.pt', 'segredo1');
  await expect(page.locator('#pendente')).toContainText('O teu pedido de acesso está à espera de aprovação do administrador.');
  await expect(page.locator('#calc')).toBeHidden();
});

test('pedido com palavra-passe curta ou email já usado', async ({ page }) => {
  await seedOnce(page, base()); await page.goto('/');
  await pedir(page, 'Rui', 'rui@x.pt', '123');
  await expect(page.locator('#pedido-msg')).toHaveText('A palavra-passe tem de ter pelo menos 6 caracteres.');
  await page.fill('#pedido-email', ADMIN); await page.fill('#pedido-pass', 'segredo1'); await page.click('#pedido-go');
  await expect(page.locator('#pedido-msg')).toContainText('Já existe uma conta com este email.');
});

test('pendente não entra nem offline (o prazo antigo é apagado)', async ({ page, context }) => {
  await seedOnce(page, { ...base(), users: { ...base().users, 'rui@x.pt': { password: 'segredo1', estado: 'pendente' } }, session: 'rui@x.pt' });
  await page.goto('/');
  await expect(page.locator('#pendente')).toBeVisible();
  // um prazo antigo (de quando estava aprovado) não pode deixar entrar
  await page.evaluate(() => localStorage.setItem('flechas-acesso', JSON.stringify({ email: 'rui@x.pt', lastVerifiedAt: Date.now() - 86400000 })));
  await page.reload();
  await expect(page.locator('#pendente')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('flechas-acesso'))).toBeNull();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true); await page.reload();
  await expect(page.locator('#locked')).toBeVisible();
  await expect(page.locator('#calc')).toBeHidden();
});

test('recusado volta ao login com a mensagem', async ({ page }) => {
  await seed(page, { ...base(), users: { ...base().users, 'rui@x.pt': { password: 'segredo1', estado: 'recusado' } }, session: 'rui@x.pt' });
  await page.goto('/');
  await expect(page.locator('#login-msg')).toHaveText('O teu acesso à app foi recusado ou retirado. Fala com o administrador.');
  await expect(page.locator('#calc')).toBeHidden();
});

test('conta antiga sem pedido fica pendente', async ({ page }) => {
  await seedOnce(page, { ...base(), users: { ...base().users, 'ana@x.pt': { password: 'segredo1', semPedido: true } } });
  await page.goto('/');
  await page.fill('#login-email', 'ana@x.pt'); await page.fill('#login-pass', 'segredo1'); await page.click('#login-go');
  await expect(page.locator('#pendente')).toBeVisible();
});

test('"Verificar outra vez" depois de aprovado entra', async ({ page }) => {
  await seedOnce(page, base()); await page.goto('/');
  await pedir(page, 'Rui', 'rui@x.pt', 'segredo1');
  await expect(page.locator('#pendente')).toBeVisible();
  await page.click('#pendente-verificar');
  await expect(page.locator('#pendente-msg')).toHaveText('Ainda não foi aprovado.');
  await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('fake-auth')); d.users['rui@x.pt'].estado = 'aprovado'; localStorage.setItem('fake-auth', JSON.stringify(d)); });
  await page.click('#pendente-verificar');
  await expect(page.locator('#calc')).toBeVisible();
});
