import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { signedIn } from './helpers.mjs';

test.beforeEach(({ page }) => signedIn(page));

async function guardarExemploPT(page) {
  await page.goto('/');
  await page.click('label[for=m-pt]'); await page.click('#new'); await page.click('#ex');
  await expect(page.locator('#r-big')).toContainText('14,69');
  await page.click('#save');
  await page.fill('#save-vao', '9-10');
  await page.selectOption('#save-cabo', 'CC1');
  await page.click('#save-ok');
}

test('guardar e ver no histórico', async ({ page }) => {
  await guardarExemploPT(page);
  await page.click('#hist-open');
  const row = page.locator('#hist-list li').first();
  await expect(row).toContainText('9-10');
  await expect(row).toContainText('CC1');
  await expect(row).toContainText('14,69');
  await expect(row).toContainText('Conforme');
});

test('abrir uma medição guardada repõe o formulário', async ({ page }) => {
  await guardarExemploPT(page);
  await page.click('#new');
  await expect(page.locator('#a')).toHaveValue('');
  await page.click('#hist-open');
  await page.locator('#hist-list li').first().getByRole('button', { name: 'Abrir' }).click();
  await expect(page.locator('#a')).toHaveValue('417,36');
  await expect(page.locator('#r-big')).toContainText('14,69');
});

test('apagar uma medição', async ({ page }) => {
  await guardarExemploPT(page);
  await page.click('#hist-open');
  page.once('dialog', d => d.accept());
  await page.locator('#hist-list li').first().getByRole('button', { name: 'Apagar' }).click();
  await expect(page.locator('#hist-list li')).toHaveCount(0);
  await expect(page.locator('#hist-empty')).toHaveText('Ainda não há medições guardadas.');
});

test('exportar JSON e importar noutro aparelho', async ({ page, browser }) => {
  await guardarExemploPT(page);
  await page.click('#hist-open');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#hist-export-json')]);
  expect(dl.suggestedFilename()).toMatch(/^flechas-\d{4}-\d{2}-\d{2}\.json$/);
  const file = await dl.path();

  const ctx = await browser.newContext({ baseURL: 'http://localhost:4173' });
  const p2 = await ctx.newPage();
  await signedIn(p2);
  await p2.goto('/');
  await p2.click('#hist-open');
  await expect(p2.locator('#hist-list li')).toHaveCount(0);
  await p2.setInputFiles('#hist-import', file);
  await expect(p2.locator('#hist-msg')).toHaveText('1 medição importada.');
  await expect(p2.locator('#hist-list li').first()).toContainText('9-10');
  await ctx.close();
});

test('exportar CSV', async ({ page }) => {
  await guardarExemploPT(page);
  await page.click('#hist-open');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#hist-export-csv')]);
  expect(dl.suggestedFilename()).toMatch(/^flechas-\d{4}-\d{2}-\d{2}\.csv$/);
  const txt = readFileSync(await dl.path(), 'utf8');
  expect(txt).toContain(';9-10;CC1;Português;417,36;14,83;');
});

test('importar ficheiro inválido não mexe na lista', async ({ page }) => {
  await guardarExemploPT(page);
  await page.click('#hist-open');
  await page.setInputFiles('#hist-import', { name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"app":"outra"}') });
  await expect(page.locator('#hist-msg')).toHaveText('Ficheiro não é uma exportação da app Flechas.');
  await expect(page.locator('#hist-list li')).toHaveCount(1);
});

test('sem resultado, Guardar medição fica desativado', async ({ page }) => {
  await page.goto('/'); await page.click('#new');
  await expect(page.locator('#save')).toBeDisabled();
});
