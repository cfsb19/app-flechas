import { test, expect } from '@playwright/test';
import { signedIn } from './helpers.mjs';
import { abrirBoletim, preencherVao910, preencherCabo, res } from './boletim-helpers.mjs';

test.beforeEach(({ page }) => signedIn(page));

test('"Tipo de apoio" em vez de "Apoio de estação" nos campos', async ({ page }) => {
  await page.goto('/'); await page.click('label[for=m-pt]');
  await expect(page.locator('#calc legend', { hasText: 'Tipo de apoio' })).toBeVisible();
  await expect(page.locator('#calc legend', { hasText: 'Apoio de estação' })).toHaveCount(0);
  await page.click('#vista-boletim'); await page.click('#boletim label[for="b-m-pt"]');
  await expect(page.locator('#boletim label[for="b-tipo"]')).toHaveText('Tipo de apoio');
});

test.describe('boletim no tablet', () => {
  test.use({ viewport: { width: 1280, height: 800 } });
  test('desnível do vão, leitura esperada e barra de tolerância em cada cabo', async ({ page }) => {
    await abrirBoletim(page); await preencherVao910(page);
    await expect(res(page, 'CC1', 'desnivel')).toContainText('6,46 m');
    await expect(res(page, 'CC1', 'esperada')).toContainText('98,8598');
    await expect(res(page, 'CC1', 'barra').locator('.gauge .band')).toBeVisible();
    await expect(res(page, 'CC1', 'barra').locator('.gauge .pin')).toContainText('−1,0 %');
  });
});

test.describe('boletim no telemóvel', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test('barra de tolerância completa no separador do cabo', async ({ page }) => {
    await abrirBoletim(page); await preencherVao910(page);
    await page.click('#boletim [role=tab][data-cabo="CC1"]');
    const g = res(page, 'CC1', 'barra').locator('.gauge');
    await expect(g).toBeVisible();
    await expect(g).toContainText('−2,5 %'); await expect(g).toContainText('+1,5 %');
    await expect(res(page, 'CC1', 'desnivel')).toContainText('6,46 m');
  });
});
