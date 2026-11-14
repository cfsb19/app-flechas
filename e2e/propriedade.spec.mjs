import { test, expect } from '@playwright/test';
import { seed, USERS, signedIn } from './helpers.mjs';

test('rodapé de propriedade visível no ecrã de login', async ({ page }) => {
  await seed(page, { users: USERS, session: null });
  await page.goto('/');
  await expect(page.locator('#login')).toBeVisible();
  await expect(page.locator('#rodape')).toBeVisible();
  await expect(page.locator('#rodape')).toContainText('© 2026 C. Batista · REN');
  await expect(page.locator('#rodape')).toContainText('Todos os direitos reservados');
});

test('rodapé na app e ecrã "Sobre" com autor e versão', async ({ page }) => {
  await signedIn(page);
  await page.goto('/');
  await expect(page.locator('#calc')).toBeVisible();
  await expect(page.locator('#rodape')).toContainText('v1.2.0');
  await page.click('#sobre-abrir');
  await expect(page.locator('#sobre')).toBeVisible();
  await expect(page.locator('#sobre')).toContainText('C. Batista');
  await expect(page.locator('#sobre')).toContainText('Uso reservado a utilizadores autorizados');
  await expect(page.locator('#sobre a[href="mailto:carlos.batista@ren.pt"]')).toBeVisible();
  await page.click('#sobre-fechar');
  await expect(page.locator('#sobre')).toBeHidden();
});
