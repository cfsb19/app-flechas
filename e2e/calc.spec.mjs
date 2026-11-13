import { test, expect } from '@playwright/test';
import { signedIn } from './helpers.mjs';

test.beforeEach(({ page }) => signedIn(page));

test('exemplo internacional dá a flecha do protótipo', async ({ page }) => {
  await page.goto('/'); await page.click('#new'); await page.click('#ex');
  await expect(page.locator('#r-big')).toContainText('13,53');
  await expect(page.locator('#r-verdict')).toHaveText('Conforme');
});

test('exemplo português (Vão 9-10 CC1) dá 14,69 m e Conforme, como o protótipo', async ({ page }) => {
  await page.goto('/'); await page.click('label[for=m-pt]'); await page.click('#new'); await page.click('#ex');
  await expect(page.locator('#r-big')).toContainText('14,69');
  await expect(page.locator('#r-verdict')).toHaveText('Conforme');
  // valores lidos do protótipo original (app/calculadora-flechas.html) com os mesmos dados
  await expect(page.locator('#stats')).toContainText('1484,8 m');
  await expect(page.locator('#stats')).toContainText('98,8598');
  await expect(page.locator('#stats')).toContainText('14,47–15,06 m');
});

test('sem pedidos fora da app (nada de Google Fonts)', async ({ page }) => {
  const ext = [];
  page.on('request', r => { if (!r.url().startsWith('http://localhost')) ext.push(r.url()); });
  await page.goto('/'); await page.waitForLoadState('networkidle');
  expect(ext).toEqual([]);
});
