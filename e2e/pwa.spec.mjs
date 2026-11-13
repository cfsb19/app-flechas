import { test, expect } from '@playwright/test';
import { signedIn } from './helpers.mjs';

test.beforeEach(({ page }) => signedIn(page));

test('funciona offline depois da primeira visita', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await page.click('#ex');
  await expect(page.locator('#r-big')).not.toHaveText('–');
});

test('manifesto com nome, ícones e display standalone', async ({ request }) => {
  const m = await (await request.get('/manifest.webmanifest')).json();
  expect(m.display).toBe('standalone');
  expect(m.lang).toBe('pt-PT');
  expect(m.icons.map(i => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
});

test('o service worker não troca /version.json nem /flechas.apk pela app', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // página passa a ser controlada pelo service worker
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  const res = await page.goto('/version.json');
  expect(res.headers()['content-type']).toContain('json');
  expect(res.fromServiceWorker()).toBe(false);
  await page.goto('/');
  const apk = await page.goto('/flechas.apk');
  expect(apk.fromServiceWorker()).toBe(false); // vem do servidor, não do service worker
});
