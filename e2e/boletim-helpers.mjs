// Preencher o boletim do vão 9-10 da folha LBL (método português).
export const VAO_910 = {
  a: '417,36', F: '-350,56', cota: '5', HS: '0,689', perna: '0',
  CC: '14,83', CG: '11,38',
  cabos: {
    CC1: { H: '31,55', cad: '4,24', zf: '97,673', z: '98,844' },
    CC3: { H: '31,55', cad: '3,7', zf: '97,66', z: '98,791' },
    CC5: { H: '31,55', cad: '4,24', zf: '97,673', z: '98,822' },
    CG1: { H: '36,55', cad: '0,34', zf: '96,927', z: '97,494' },
  },
};

export async function abrirBoletim(page) {
  await page.goto('/');
  await page.click('#vista-boletim');
}

const f = (page, path) => page.locator(`#boletim [data-path="${path}"]`);

export async function preencherCabo(page, cabo, vals) {
  const tab = page.locator(`#boletim [role=tab][data-cabo="${cabo}"]`);
  if (await tab.isVisible()) await tab.click();
  for (const [k, v] of Object.entries(vals)) await f(page, `cabos.${cabo}.${k}`).fill(v);
}

export async function preencherVao910(page, { reg = false } = {}) {
  await page.click('#boletim label[for="b-m-pt"]');
  await f(page, 'vao').fill('9-10');
  for (const k of ['a', 'F', 'cota', 'HS', 'perna']) await f(page, k).fill(VAO_910[k]);
  if (!reg) { await f(page, 'teor.CC.direta').fill(VAO_910.CC); await f(page, 'teor.CG.direta').fill(VAO_910.CG); }
  for (const [cabo, vals] of Object.entries(VAO_910.cabos)) {
    const v = { ...vals }; if (reg) delete v.z;
    await preencherCabo(page, cabo, v);
  }
}

export const res = (page, cabo, k) => page.locator(`#boletim [data-res="${k}"][data-cabo="${cabo}"]`);
