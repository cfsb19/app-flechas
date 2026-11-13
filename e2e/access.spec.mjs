import { test, expect } from '@playwright/test';
import { seed, seedLease, USERS } from './helpers.mjs';

const U = { users: USERS, session: null };
const D = 86400000;

test('login certo mostra a calculadora', async ({ page }) => {
  await seed(page, U); await page.goto('/');
  await page.fill('#login-email', 'ana@x.pt'); await page.fill('#login-pass', 'segredo1'); await page.click('#login-go');
  await expect(page.locator('#calc')).toBeVisible();
  await expect(page.locator('#account-email')).toHaveText('ana@x.pt');
});

test('palavra-passe errada', async ({ page }) => {
  await seed(page, U); await page.goto('/');
  await page.fill('#login-email', 'ana@x.pt'); await page.fill('#login-pass', 'x'); await page.click('#login-go');
  await expect(page.locator('#login-msg')).toHaveText('Email ou palavra-passe errados.');
  await expect(page.locator('#calc')).toBeHidden();
});

test('conta desativada com sessão aberta: volta ao login com aviso', async ({ page }) => {
  await seed(page, { users: { 'ana@x.pt': { password: 'segredo1', disabled: true } }, session: 'ana@x.pt' });
  await seedLease(page, 'ana@x.pt', D);
  await page.goto('/');
  await expect(page.locator('#login-msg')).toHaveText('A tua conta foi desativada. Fala com o administrador.');
  await expect(page.locator('#calc')).toBeHidden();
});

test('offline dentro do prazo: abre', async ({ page, context }) => {
  await seed(page, { ...U, session: 'ana@x.pt' }); await seedLease(page, 'ana@x.pt', D);
  await page.goto('/'); await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true); await page.reload();
  await expect(page.locator('#calc')).toBeVisible();
});

test('offline com prazo esgotado: bloqueado', async ({ page, context }) => {
  await seed(page, { ...U, session: 'ana@x.pt' }); await seedLease(page, 'ana@x.pt', 8 * D);
  await page.goto('/'); await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true); await page.reload();
  await expect(page.locator('#locked')).toContainText('Liga-te à internet para confirmar o teu acesso.');
  await expect(page.locator('#calc')).toBeHidden();
});

test('prazo esgotado: "Tentar novamente" sem rede avisa; quando a rede volta, desbloqueia', async ({ page, context }) => {
  await seed(page, { ...U, session: 'ana@x.pt' }); await seedLease(page, 'ana@x.pt', 8 * D);
  await page.goto('/'); await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true); await page.reload();
  await expect(page.locator('#locked')).toBeVisible();
  await page.click('#locked-retry');
  await expect(page.locator('#locked-msg')).toHaveText('Ainda sem ligação. Tenta outra vez quando tiveres rede.');
  await context.setOffline(false);
  await expect(page.locator('#calc')).toBeVisible();
});

test('primeiro arranque sem rede e sem sessão', async ({ page, context }) => {
  await seed(page, U); await page.goto('/'); await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true); await page.reload();
  await page.fill('#login-email', 'ana@x.pt'); await page.fill('#login-pass', 'segredo1'); await page.click('#login-go');
  await expect(page.locator('#login-msg')).toHaveText('Para entrar precisas de internet.');
});

test('sair volta ao login', async ({ page }) => {
  await seed(page, { ...U, session: 'ana@x.pt' }); await seedLease(page, 'ana@x.pt', D);
  await page.goto('/'); await expect(page.locator('#calc')).toBeVisible();
  await page.click('#account-logout');
  await expect(page.locator('#login')).toBeVisible();
  await expect(page.locator('#calc')).toBeHidden();
});

test('esqueci-me da palavra-passe', async ({ page }) => {
  await seed(page, U); await page.goto('/');
  await page.fill('#login-email', 'ana@x.pt'); await page.click('#login-reset');
  await expect(page.locator('#login-msg')).toHaveText('Se o email existir, vais receber um link para definir a palavra-passe.');
});

test('rede fraca: abre logo dentro do prazo, sem esperar pelo servidor', async ({ page }) => {
  await seed(page, { ...U, session: 'ana@x.pt', currentUserDelayMs: 60000, verifyDelayMs: 60000 });
  await seedLease(page, 'ana@x.pt', D);
  await page.goto('/');
  await expect(page.locator('#calc')).toBeVisible({ timeout: 4000 });
});

test('rede fraca sem prazo guardado: mostra "A verificar o acesso…"', async ({ page }) => {
  await seed(page, { ...U, session: 'ana@x.pt', currentUserDelayMs: 60000 });
  await page.goto('/');
  await expect(page.locator('#checking')).toHaveText('A verificar o acesso…', { timeout: 4000 });
});
