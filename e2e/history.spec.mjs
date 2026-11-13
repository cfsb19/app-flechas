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
  expect(txt).toContain(';9-10;CC1;Verificação;Português;18;18;417,36;14,83;');
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

test('falha ao gravar no aparelho: avisa e não perde os dados do formulário', async ({ page }) => {
  await page.goto('/');
  await page.click('label[for=m-pt]'); await page.click('#new'); await page.click('#ex');
  await expect(page.locator('#r-big')).toContainText('14,69');
  await page.evaluate(() => { IDBObjectStore.prototype.put = function () { throw new DOMException('Connection lost', 'UnknownError'); }; });
  await page.click('#save'); await page.fill('#save-vao', '9-10'); await page.click('#save-ok');
  await expect(page.locator('#save-msg')).toHaveText('Não foi possível guardar a medição. Tenta outra vez.');
  await expect(page.locator('#save-dialog')).toBeVisible();
  await expect(page.locator('#a')).toHaveValue('417,36');
});

test('falha ao ler o histórico: abre o painel com aviso', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => { IDBObjectStore.prototype.getAll = function () { throw new DOMException('Connection lost', 'UnknownError'); }; });
  await page.click('#hist-open');
  await expect(page.locator('#hist')).toBeVisible();
  await expect(page.locator('#hist-msg')).toHaveText('Não foi possível ler o histórico. Fecha e volta a abrir a app.');
});

test.describe('boletins no histórico (tablet)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  async function guardarBoletim(page) {
    const { abrirBoletim, preencherVao910 } = await import('./boletim-helpers.mjs');
    await abrirBoletim(page); await preencherVao910(page);
    await expect(page.locator('#b-resumo')).toContainText('4 de 4 conformes');
    await page.click('#b-save');
    await expect(page.locator('#save-vao')).toHaveValue('9-10');
    await expect(page.locator('#save-cabo')).toBeHidden();
    await page.click('#save-ok');
  }

  test('guardar boletim e reabrir', async ({ page }) => {
    await guardarBoletim(page);
    page.once('dialog', d => d.accept());
    await page.click('#b-novo');
    await expect(page.locator('#b-resumo')).not.toContainText('conformes');
    await page.click('#b-hist');
    const row = page.locator('#hist-list li').first();
    await expect(row).toContainText('9-10 · Boletim · 4/4 conformes');
    await row.getByRole('button', { name: 'Abrir' }).click();
    await expect(page.locator('#boletim')).toBeVisible();
    await expect(page.locator('#b-resumo')).toContainText('4 de 4 conformes');
  });

  test('guardar de novo um boletim reaberto atualiza o mesmo registo', async ({ page }) => {
    await guardarBoletim(page);
    await page.click('#b-hist');
    await page.locator('#hist-list li').first().getByRole('button', { name: 'Abrir' }).click();
    await page.click('#b-save'); await page.click('#save-ok');
    await page.click('#b-hist');
    await expect(page.locator('#hist-list li')).toHaveCount(1);
  });

  test('boletim em CSV: uma linha por cabo', async ({ page }) => {
    await guardarBoletim(page);
    await page.click('#b-hist');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#hist-export-csv')]);
    const txt = readFileSync(await dl.path(), 'utf8');
    for (const c of ['CC1', 'CC3', 'CC5', 'CG1']) expect(txt).toContain(`;9-10;${c};Verificação;Português;`);
  });
});

test('regulação cabo a cabo também se guarda', async ({ page }) => {
  await page.goto('/');
  await page.click('label[for=m-pt]'); await page.click('#new'); await page.click('#ex');
  await page.click('label[for=modo-reg]');
  await page.fill('#preg', '1484,842');
  await expect(page.locator('#r-lbl')).toHaveText('Leitura a apontar');
  await page.click('#save'); await page.fill('#save-vao', '9-10'); await page.click('#save-ok');
  await page.click('#hist-open');
  await expect(page.locator('#hist-list li').first()).toContainText('Regulação');
  await expect(page.locator('#hist-list li').first()).toContainText('98,844');
});
