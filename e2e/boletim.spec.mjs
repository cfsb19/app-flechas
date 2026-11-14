import { test, expect } from '@playwright/test';
import { signedIn } from './helpers.mjs';
import { abrirBoletim, preencherVao910, preencherCabo, res } from './boletim-helpers.mjs';

test.beforeEach(({ page }) => signedIn(page));

test.describe('tablet na horizontal (1280 × 800)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('tabela com os 8 cabos e resultados da folha LBL', async ({ page }) => {
    await abrirBoletim(page);
    await expect(page.locator('#calc')).toBeHidden();
    const table = page.locator('#boletim table');
    await expect(table).toBeVisible();
    for (const c of ['CC1', 'CC2', 'CC3', 'CC4', 'CC5', 'CC6', 'CG1', 'CG2']) await expect(table.locator('thead')).toContainText(c);
    await preencherVao910(page);
    await expect(res(page, 'CC1', 'flecha')).toContainText('14,69');
    await expect(res(page, 'CG1', 'flecha')).toContainText('11,24');
    await expect(page.locator('#b-resumo')).toContainText('4 de 4 conformes');
  });

  test('regulação: parâmetro do grupo dá a leitura a apontar', async ({ page }) => {
    await abrirBoletim(page);
    await page.click('label[for=modo-reg]');
    await preencherVao910(page, { reg: true });
    await page.locator('#boletim [data-path="param.CC.direta"]').fill('1484,842');
    await expect(res(page, 'CC1', 'leitura')).toContainText('98,844');
  });

  test('rodar o tablet e recarregar não perde nada', async ({ page }) => {
    await abrirBoletim(page);
    await preencherVao910(page);
    await expect(page.locator('#b-resumo')).toContainText('4 de 4 conformes');
    await page.setViewportSize({ width: 800, height: 1280 });
    await expect(page.locator('#b-resumo')).toContainText('4 de 4 conformes');
    await page.reload();
    await expect(page.locator('#boletim')).toBeVisible();
    await expect(page.locator('#boletim [data-path="a"]')).toHaveValue('417,36');
    await expect(page.locator('#b-resumo')).toContainText('4 de 4 conformes');
  });

  test('valor próprio de um cabo', async ({ page }) => {
    await abrirBoletim(page);
    await preencherVao910(page);
    await page.click('#boletim [data-act="proprio"][data-cabo="CC3"]');
    await page.locator('#boletim [data-path="cabos.CC3.teor.direta"]').fill('16');
    await expect(res(page, 'CC3', 'resultado')).toContainText('Não conforme');
    await expect(page.locator('#b-resumo')).toContainText('3 de 4 conformes');
    await expect(page.locator('#b-resumo')).toContainText('CC3');
  });

  test('novo boletim pede confirmação e limpa', async ({ page }) => {
    await abrirBoletim(page);
    await preencherVao910(page);
    page.once('dialog', d => d.accept());
    await page.click('#b-novo');
    await expect(page.locator('#boletim [data-path="cabos.CC1.zf"]')).toHaveValue('');
    await expect(page.locator('#b-resumo')).not.toContainText('conformes');
  });
});

test.describe('tablet na vertical (800 × 1280)', () => {
  test.use({ viewport: { width: 800, height: 1280 } });
  test('tabela com deslocamento e coluna das etiquetas fixa', async ({ page }) => {
    await abrirBoletim(page);
    await expect(page.locator('#boletim table')).toBeVisible();
    const pos = await page.locator('#boletim table tbody th').first().evaluate(el => getComputedStyle(el).position);
    expect(pos).toBe('sticky');
    await preencherVao910(page);
    await expect(page.locator('#b-resumo')).toContainText('4 de 4 conformes');
  });
});

test.describe('telemóvel (390 × 844)', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test('separadores por cabo e resumo', async ({ page }) => {
    await abrirBoletim(page);
    await expect(page.locator('#boletim table')).toHaveCount(0);
    await expect(page.locator('#boletim [role=tab]')).toHaveCount(8);
    await preencherVao910(page);
    await page.click('#boletim [role=tab][data-cabo="CC1"]');
    await expect(res(page, 'CC1', 'flecha')).toContainText('14,69');
    await expect(page.locator('#b-resumo')).toContainText('4 de 4 conformes');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow).toBe(false);
  });
});

test('a vista escolhida fica guardada', async ({ page }) => {
  await abrirBoletim(page);
  await page.reload();
  await expect(page.locator('#boletim')).toBeVisible();
  await page.click('#vista-cabo');
  await expect(page.locator('#calc')).toBeVisible();
  await expect(page.locator('#boletim')).toBeHidden();
});
