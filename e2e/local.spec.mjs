import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const OUT = resolve('dist-local');

test.beforeAll(() => { execSync('npm run build:html', { stdio: 'ignore' }); });

test('cópia num só ficheiro: abre sem login e sem rede', async ({ page }) => {
  expect(readdirSync(OUT)).toEqual(['flechas.html']);
  expect(statSync(resolve(OUT, 'flechas.html')).size).toBeLessThan(2_000_000);
  const fora = [];
  page.on('request', r => { const u = r.url(); if (!/^(file|data|blob):/.test(u)) fora.push(u); });
  await page.goto('file://' + resolve(OUT, 'flechas.html'));
  await expect(page.locator('#login')).toBeHidden();
  await expect(page.locator('#calc')).toBeVisible();
  await expect(page.locator('#account')).toContainText('Versão local');
  await page.click('#new'); await page.click('#ex');
  await expect(page.locator('#r-big')).toContainText('13,53');
  await page.click('#save'); await page.fill('#save-vao', '1-2'); await page.click('#save-ok');
  await expect(page.locator('#save-dialog')).toBeHidden();
  await page.click('#hist-open');
  await expect(page.locator('#hist-list li')).toHaveCount(1);
  await page.click('#hist-close');
  await page.click('#vista-boletim');
  await expect(page.locator('#boletim')).toBeVisible();
  expect(fora).toEqual([]);
});
