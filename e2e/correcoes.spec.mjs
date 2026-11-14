import { test, expect } from '@playwright/test';
import { signedIn } from './helpers.mjs';
import { abrirBoletim, preencherVao910, preencherCabo, res } from './boletim-helpers.mjs';

test.beforeEach(({ page }) => signedIn(page));

test.describe('boletim (tablet)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('guardar o vão seguinte sem "Novo boletim" cria outro registo', async ({ page }) => {
    await abrirBoletim(page); await preencherVao910(page);
    await page.click('#b-save'); await page.click('#save-ok');
    await expect(page.locator('#save-dialog')).toBeHidden();
    await page.locator('#boletim [data-path="vao"]').fill('10-11');
    await page.locator('#boletim [data-path="cabos.CC1.z"]').fill('98,9');
    await page.click('#b-save');
    await expect(page.locator('#save-vao')).toHaveValue('10-11');
    await page.click('#save-ok');
    await expect(page.locator('#save-dialog')).toBeHidden();
    await page.click('#b-hist');
    await expect(page.locator('#hist-list li')).toHaveCount(2);
    await expect(page.locator('#hist-list')).toContainText('9-10');
    await expect(page.locator('#hist-list')).toContainText('10-11');
  });

  test('avisos e sensibilidade aparecem no boletim', async ({ page }) => {
    await abrirBoletim(page);
    const f = p => page.locator(`#boletim [data-path="${p}"]`);
    await f('a').fill('402,07'); await f('t').fill('267,11'); await f('teor.CC.direta').fill('12,79');
    await preencherCabo(page, 'CC1', { z1: '84,311', z2: '92,176', z: '92,2' });
    await expect(res(page, 'CC1', 'sens')).toContainText('35 cm');
    await expect(res(page, 'CC1', 'avisos')).toContainText('92 %');
  });
});

test('reabrir uma medição repõe a correção de temperatura usada', async ({ page }) => {
  await page.goto('/'); await page.click('label[for=m-pt]'); await page.click('#new'); await page.click('#ex');
  await page.selectOption('#cabo', 'CC1');
  await page.fill('#temp', '17,5'); await page.fill('#corr', '2');
  await page.click('label[for=teor-tabela]');
  await page.locator('#teor-tab input[data-t="15"]').fill('14,5');
  await page.locator('#teor-tab input[data-t="20"]').fill('15,1');
  await expect(page.locator('#r-sub')).toContainText('Teórica 14,56');
  await page.click('#save'); await page.fill('#save-vao', '9-10'); await page.click('#save-ok');
  await expect(page.locator('#save-dialog')).toBeHidden();
  await page.fill('#corr', '0');
  await expect(page.locator('#r-sub')).toContainText('Teórica 14,80');
  await page.click('#hist-open');
  await page.locator('#hist-list li').first().getByRole('button', { name: 'Abrir' }).click();
  await expect(page.locator('#corr')).toHaveValue('2');
  await expect(page.locator('#r-sub')).toContainText('Teórica 14,56');
});

test('o braço do apoio segue o cabo ao mudar de método e em "Nova medição"', async ({ page }) => {
  await page.goto('/'); await page.click('label[for=m-int]');
  await page.selectOption('#cabo', 'CG1');
  await page.click('label[for=m-pt]');
  await expect(page.locator('#ponto')).toHaveValue('ht');
  await page.click('#new');
  await expect(page.locator('#ponto')).toHaveValue('ht');
});
