# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: calc.spec.mjs >> exemplo português (Vão 9-10 CC1) dá 14,69 m e Conforme, como o protótipo
- Location: e2e/calc.spec.mjs:9:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('#r-big')
Expected substring: "14,69"
Received string:    "17,06m"
Timeout: 5000ms

Call log:
  - Expect "toContainText" locator('#r-big') with timeout 5000ms
  - waiting for locator('#r-big')
    14 × locator resolved to <div id="r-big" class="big">…</div>
       - unexpected value "17,06m"

```

```yaml
- text: 17,06m
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('exemplo internacional dá a flecha do protótipo', async ({ page }) => {
  4  |   await page.goto('/'); await page.click('#new'); await page.click('#ex');
  5  |   await expect(page.locator('#r-big')).toContainText('13,53');
  6  |   await expect(page.locator('#r-verdict')).toHaveText('Conforme');
  7  | });
  8  | 
  9  | test('exemplo português (Vão 9-10 CC1) dá 14,69 m e Conforme, como o protótipo', async ({ page }) => {
  10 |   await page.goto('/'); await page.click('label[for=m-pt]'); await page.click('#new'); await page.click('#ex');
> 11 |   await expect(page.locator('#r-big')).toContainText('14,69');
     |                                        ^ Error: expect(locator).toContainText(expected) failed
  12 |   await expect(page.locator('#r-verdict')).toHaveText('Conforme');
  13 |   // valores lidos do protótipo original (app/calculadora-flechas.html) com os mesmos dados
  14 |   await expect(page.locator('#stats')).toContainText('1484,8 m');
  15 |   await expect(page.locator('#stats')).toContainText('98,8598');
  16 |   await expect(page.locator('#stats')).toContainText('14,47–15,06 m');
  17 | });
  18 | 
  19 | test('sem pedidos fora da app (nada de Google Fonts)', async ({ page }) => {
  20 |   const ext = [];
  21 |   page.on('request', r => { if (!r.url().startsWith('http://localhost')) ext.push(r.url()); });
  22 |   await page.goto('/'); await page.waitForLoadState('networkidle');
  23 |   expect(ext).toEqual([]);
  24 | });
  25 | 
```