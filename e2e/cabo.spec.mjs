import { test, expect } from '@playwright/test';
import { signedIn } from './helpers.mjs';

test.beforeEach(({ page }) => signedIn(page));

test('cabo CG1 no método português usa o topo (Ht)', async ({ page }) => {
  await page.goto('/'); await page.click('label[for=m-pt]');
  await page.selectOption('#cabo', 'CG1');
  await expect(page.locator('#ponto')).toHaveValue('ht');
  await page.selectOption('#cabo', 'CC3');
  await expect(page.locator('#ponto')).toHaveValue('med');
});

test('correção de temperatura por grupo e temperatura de cálculo', async ({ page }) => {
  await page.goto('/'); await page.click('#new');
  await page.selectOption('#cabo', 'CC1');
  await page.fill('#temp', '15'); await page.fill('#corr', '10');
  await expect(page.locator('#corr-lbl')).toContainText('(CC)');
  await expect(page.locator('#tc')).toHaveText('Temperatura de cálculo 5 °C');
  await page.selectOption('#cabo', 'CG1');
  await expect(page.locator('#corr-lbl')).toContainText('(CG)');
  await expect(page.locator('#corr')).toHaveValue('');
  await expect(page.locator('#tc')).toHaveText('Temperatura de cálculo 15 °C');
  await page.selectOption('#cabo', 'CC2');
  await expect(page.locator('#corr')).toHaveValue('10');
});

test('flecha teórica pela tabela: 1 campo em múltiplo de 5, 2 campos e interpolação nos outros', async ({ page }) => {
  await page.goto('/'); await page.click('#new'); await page.click('#ex');
  await page.selectOption('#cabo', 'CC1');
  await page.fill('#corr', '10'); await page.fill('#temp', '15');
  await page.click('label[for=teor-tabela]');
  const tab = page.locator('#teor-tab');
  await expect(tab.locator('input')).toHaveCount(1);
  await expect(tab).toContainText('Flecha a 5 °C');
  await page.fill('#temp', '17');
  await expect(tab.locator('input')).toHaveCount(2);
  await expect(tab).toContainText('Flecha a 5 °C'); await expect(tab).toContainText('Flecha a 10 °C');
  await tab.locator('input[data-t="5"]').fill('12,00'); await tab.locator('input[data-t="10"]').fill('13,00');
  await expect(page.locator('#r-sub')).toContainText('Teórica 12,40');
  // mudar a temperatura não apaga o que já foi escrito
  await page.fill('#temp', '15');
  await expect(tab.locator('input[data-t="5"]')).toHaveValue('12,00');
  await page.fill('#temp', '17');
  await expect(tab.locator('input[data-t="10"]')).toHaveValue('13,00');
});

test('regulação: parâmetro dá a leitura a apontar', async ({ page }) => {
  await page.goto('/'); await page.click('label[for=m-pt]'); await page.click('#new'); await page.click('#ex');
  await page.click('label[for=modo-reg]');
  await expect(page.locator('#z')).toBeHidden();
  await expect(page.locator('#teor-lbl')).toHaveText('Parâmetro');
  await page.fill('#preg', '1484,842');
  await expect(page.locator('#r-lbl')).toHaveText('Leitura a apontar');
  await expect(page.locator('#r-big')).toContainText('98,844');
  await page.click('label[for=modo-ver]');
  await expect(page.locator('#z')).toBeVisible();
  await expect(page.locator('#r-big')).toContainText('14,69');
});

test('nova medição propõe a temperatura escrita hoje', async ({ page }) => {
  await page.goto('/'); await page.fill('#temp', '17');
  await page.click('#new');
  await expect(page.locator('#temp')).toHaveValue('17');
});
