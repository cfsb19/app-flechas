import { test, expect } from '@playwright/test';

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
