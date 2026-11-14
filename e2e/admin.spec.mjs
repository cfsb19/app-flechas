import { test, expect } from '@playwright/test';
import { seedOnce, ADMIN } from './helpers.mjs';

const estado = () => ({
  users: {
    [ADMIN]: { password: 'admin123' },
    'rui@x.pt': { password: 'segredo1', nome: 'Rui Sousa', estado: 'pendente' },
    'ana@x.pt': { password: 'segredo1', nome: 'Ana Lima', estado: 'aprovado' },
  },
  session: ADMIN, admin: ADMIN,
});

test('administrador vê a faixa de pendentes e aprova', async ({ page }) => {
  await seedOnce(page, estado()); await page.goto('/');
  await expect(page.locator('#calc')).toBeVisible();
  await expect(page.locator('#admin-faixa')).toContainText('1 pedido de acesso pendente');
  await page.click('#admin-faixa button');
  await expect(page.locator('#admin')).toBeVisible();
  const pend = page.locator('#admin-pendentes li:not(.admin-vazio)');
  await expect(pend).toHaveCount(1);
  await expect(pend.first()).toContainText('Rui Sousa');
  await expect(pend.first()).toContainText('rui@x.pt');
  await pend.first().getByRole('button', { name: 'Aprovar' }).click();
  await expect(page.locator('#admin-pendentes li:not(.admin-vazio)')).toHaveCount(0);
  await expect(page.locator('#admin-aprovados')).toContainText('rui@x.pt');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('fake-auth')).users['rui@x.pt'].estado)).toBe('aprovado');
});

test('retirar acesso', async ({ page }) => {
  await seedOnce(page, estado()); await page.goto('/');
  await page.click('#admin-abrir');
  const ana = page.locator('#admin-aprovados li', { hasText: 'ana@x.pt' });
  await ana.getByRole('button', { name: 'Retirar acesso' }).click();
  await expect(page.locator('#admin-recusados')).toContainText('ana@x.pt');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('fake-auth')).users['ana@x.pt'].estado)).toBe('recusado');
});

test('quem não é administrador não vê a Administração', async ({ page }) => {
  await seedOnce(page, { ...estado(), session: 'ana@x.pt' }); await page.goto('/');
  await expect(page.locator('#calc')).toBeVisible();
  await expect(page.locator('#admin-abrir')).toBeHidden();
  await expect(page.locator('#admin-faixa')).toHaveCount(0);
});
