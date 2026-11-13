# App Flechas: PWA + APK — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** transformar o protótipo `app/calculadora-flechas.html` numa PWA instalável e num APK Android, com login por email, corte de acesso e histórico de medições local.

**Arquitetura:** há uma base de código web (Vite, módulos ES) que reutiliza `core/flechas-core.mjs` sem alterações. A PWA é gerada pelo `vite-plugin-pwa` e alojada no Firebase Hosting. O APK é o mesmo `dist/` empacotado pelo Capacitor e construído no GitHub Actions. O acesso é controlado pelo Firebase Authentication, com um prazo offline de 7 dias calculado no cliente. As medições ficam em IndexedDB e nunca saem do aparelho.

**Tecnologias:** Vite, vite-plugin-pwa (Workbox), Firebase JS SDK (só `firebase/app` e `firebase/auth`), `idb`, `@fontsource/barlow` e `@fontsource/barlow-semi-condensed`, Capacitor (`core`, `android`, `filesystem`, `share`), `node --test`, `fake-indexeddb`, `@playwright/test`. Versões: a estável mais recente no momento da instalação, fixada pelo `package-lock.json`.

**Spec:** `docs/superpowers/specs/2026-11-13-app-flechas-pwa-apk-design.md`

## Restrições globais

- `core/flechas-core.mjs`, `data/postes.json` e `tests/casos-validacao.json` **não mudam**. Os 17 testes existentes continuam a passar.
- Os resultados de cálculo mostrados ficam iguais aos do protótipo para os mesmos dados.
- Nenhum pedido de rede além do Firebase Auth, do service worker ou alojamento e do `version.json`. Nada de CDN nem de Google Fonts.
- As medições nunca são enviadas para a rede.
- Prazo offline: **7 dias** (`LEASE_DAYS = 7`).
- Textos de interface em português europeu. A entrada numérica aceita vírgula decimal (o `parseNum` atual).
- Custo zero: Firebase plano Spark e GitHub Actions dentro da quota gratuita.
- `package.json` com `"type": "module"`. Testes unitários em `tests/*.test.mjs` (correm com `node --test`) e testes e2e em `e2e/*.spec.mjs`, que o `node --test` não apanha.
- No contentor de desenvolvimento, o Playwright usa o Chromium em `/opt/pw-browsers/chromium` através de `PW_CHROMIUM`. No CI corre-se `npx playwright install --with-deps chromium`.

## Pontos de atenção na revisão

1. **Relógio do telemóvel mexido offline.** Se a hora atual for anterior à última verificação, o prazo conta como expirado e a app pede ligação. Teste na Tarefa 3.
2. **Rede instável durante a verificação.** Um timeout ou erro de rede não pode contar como acesso cortado nem bloquear a app dentro do prazo. Testes nas Tarefas 3 e 4.
3. **Primeiro arranque sem rede e sem sessão.** Mostra o login com a mensagem de rede, sem ficar preso num "a carregar" nem dar erro. Teste na Tarefa 4.
4. **IndexedDB indisponível,** por exemplo em navegação privada ou num browser restrito. A calculadora continua a funcionar e o histórico mostra aviso em vez de falhar. Teste na Tarefa 5.
5. **Importar um JSON estragado, de outra app ou com duplicados.** É rejeitado com mensagem ou importado sem duplicar, e nunca apaga nem corrompe o que já existe. Teste na Tarefa 5.

---

### Task 1: Projeto Vite com o protótipo modularizado

**Ficheiros:**
- Criar: `package.json`, `vite.config.js`, `index.html`, `src/styles.css`, `src/main.js`, `src/calc/app.js`, `src/calc/tipos.js`, `src/num.js`, `tests/num.test.mjs`, `e2e/calc.spec.mjs`, `playwright.config.mjs`
- Manter sem alterações: `app/calculadora-flechas.html`, que fica como versão antiga de ficheiro único

**Interfaces:**
- Consome: de `core/flechas-core.mjs`, `G2R, geometry, solveTangent, solveParam, flechaInternacional, flechaPortugues, pFromSag`.
- Produz:
  - `src/num.js`: `parseNum(str) -> number` (NaN se inválido), `fmt(v, dec) -> string` (pt-PT), `fmtIn(v) -> string`.
  - `src/calc/app.js`: `mountCalc(root: HTMLElement) -> { getState(): object, setState(s: object): void, lastResult(): Result|null }`, em que `Result` tem pelo menos `{ M, flecha, ft, desvio, conforme, p }` (os campos que o `compute` do protótipo já calcula; o implementador mapeia os nomes).
  - `npm test` executa `node --test`. `npm run build` gera `dist/`. `npm run e2e` executa o Playwright contra `vite preview`.

- [ ] **Passo 1: criar o `package.json` e instalar as dependências**

Scripts: `"dev": "vite"`, `"build": "vite build"`, `"preview": "vite preview --port 4173"`, `"test": "node --test"`, `"e2e": "playwright test"`. Dependências: `@fontsource/barlow` e `@fontsource/barlow-semi-condensed`. Dependências de desenvolvimento: `vite` e `@playwright/test`. Executar `npm install`.

- [ ] **Passo 2: escrever o teste que falha, `tests/num.test.mjs`**

```js
import { test } from 'node:test'; import assert from 'node:assert/strict';
import { parseNum, fmt } from '../src/num.js';
test('parseNum aceita vírgula, ponto, sinal menos tipográfico e espaços', () => {
  assert.equal(parseNum('425,48'), 425.48);
  assert.equal(parseNum('425.48'), 425.48);
  assert.equal(parseNum('−350,56'), -350.56);
  assert.equal(parseNum(' 1 234,5 '), 1234.5);
  assert.ok(Number.isNaN(parseNum('')));
  assert.ok(Number.isNaN(parseNum('12,3,4')));
});
test('fmt usa formato pt-PT', () => { assert.equal(fmt(14.6898, 2), '14,69'); assert.equal(fmt(NaN, 2), '–'); });
```

- [ ] **Passo 3: executar `npm test` e confirmar que falha (o módulo `src/num.js` não existe)**

- [ ] **Passo 4: dividir o protótipo pelos módulos**

- O markup do `<body>` vai para `index.html`, dentro de `<div id="calc">`, e o CSS do `<style>` vai para `src/styles.css`.
- `parseNum`, `fmt`, `fmtIn` e `sfmt` vão para `src/num.js`.
- A tabela `POSTES_RAW` é substituída por `import postes from '../../data/postes.json'` (`postes.apoios`), e o combobox de tipos vai para `src/calc/tipos.js`.
- O resto do script vai para `src/calc/app.js`.
- **As cópias de `geometry`, `Ftan`, `solveTangent`, `solveParam`, `pFromSag`, `fDocOf` e `fMidOf` são apagadas e passam a ser importadas do core** (`fDocOf` = `flechaInternacional`, `fMidOf` = `flechaPortugues`). A função `sags` fica em `app.js`.
- A chave de localStorage do formulário (`flechas-verificacao-v3`) mantém-se.
- Os tipos de letra vêm por `import '@fontsource/barlow/400.css'` (e `500`, `600`) e `@fontsource/barlow-semi-condensed` (`500`, `600`, `700`) em `src/main.js`. As `<link>` do Google Fonts são removidas.
- `src/main.js` importa os estilos e chama `mountCalc(document.getElementById('calc'))`.

- [ ] **Passo 5: executar `npm test`. Esperado: PASS, com os 17 testes antigos e os de `num`.**

- [ ] **Passo 6: escrever o e2e `e2e/calc.spec.mjs` com `playwright.config.mjs`**

O `webServer` executa `npm run build && npm run preview`, a `baseURL` é `http://localhost:4173` e o `executablePath` vem de `process.env.PW_CHROMIUM`.

```js
test('exemplo internacional dá a flecha do protótipo', async ({ page }) => {
  await page.goto('/'); await page.click('#new'); await page.click('#ex');
  await expect(page.locator('#r-big')).toContainText('13,53');
});
test('exemplo português (Vão 9-10 CC1) dá 14,69 m e Conforme', async ({ page }) => {
  await page.goto('/'); await page.click('label[for=m-pt]'); await page.click('#new'); await page.click('#ex');
  await expect(page.locator('#out')).toContainText('14,69');
  await expect(page.locator('#r-verdict')).toContainText(/Conforme/);
});
test('sem pedidos a fonts.googleapis.com', async ({ page }) => {
  const ext = []; page.on('request', r => { if (!r.url().startsWith('http://localhost')) ext.push(r.url()); });
  await page.goto('/'); await page.waitForLoadState('networkidle'); expect(ext).toEqual([]);
});
```

Antes de fixar os valores esperados (`13,53` e `14,69`), confirmar no `app/calculadora-flechas.html` original, com o Playwright, o texto exato que aparece em `#r-big` e `#r-verdict`. Os testes devem usar esse texto.

- [ ] **Passo 7: executar `PW_CHROMIUM=/opt/pw-browsers/chromium npm run e2e`. Esperado: 3 PASS.**

- [ ] **Passo 8: fazer commit, `git commit -m "Projeto Vite: protótipo modularizado, cálculo importado do núcleo"`**

---

### Task 2: PWA offline e instalável

**Ficheiros:**
- Criar: `public/icons/` (`icon-192.png`, `icon-512.png`, `maskable-512.png`, `apple-touch-icon-180.png`, `icon.svg`), `src/pwa.js`, `e2e/pwa.spec.mjs`
- Modificar: `vite.config.js`, `index.html`, `src/main.js`, `src/styles.css`

**Interfaces:**
- Produz: `initPwa(): void`. Regista o service worker com `registerType: 'prompt'`, mostra a faixa de atualização e mostra a dica de instalação no iOS.

- [ ] **Passo 1: escrever o e2e `e2e/pwa.spec.mjs` (falha)**

```js
test('funciona offline depois da primeira visita', async ({ page, context }) => {
  await page.goto('/'); await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true); await page.reload();
  await page.click('#ex'); await expect(page.locator('#r-big')).not.toHaveText('–');
});
test('manifesto com nome, ícones e display standalone', async ({ request }) => {
  const m = await (await request.get('/manifest.webmanifest')).json();
  expect(m.display).toBe('standalone'); expect(m.lang).toBe('pt-PT');
  expect(m.icons.map(i => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
});
```

- [ ] **Passo 2: executar o e2e e confirmar que falha (ainda não há service worker)**

- [ ] **Passo 3: configurar o `VitePWA` em `vite.config.js`**

- Manifesto: `name: 'Flechas — verificação por visada'`, `short_name: 'Flechas'`, `lang: 'pt-PT'`, `display: 'standalone'`, `theme_color` e `background_color` a partir de `--ink` e `--paper` do CSS.
- Workbox: `globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}']`, com `navigateFallback: '/index.html'`.
- Ícones: um SVG simples (curva do cabo entre dois apoios) exportado para os PNG. A ferramenta fica ao critério do implementador.
- `index.html`: acrescentar `apple-touch-icon` e `apple-mobile-web-app-capable`.

- [ ] **Passo 4: implementar o `initPwa` em `src/pwa.js`**

- Usa `registerSW` de `virtual:pwa-register`.
- `onNeedRefresh` mostra a faixa "Há uma versão nova da app." com o botão "Atualizar", que chama `updateSW(true)`. Nunca recarrega sozinho, para não interromper uma medição.
- No iOS Safari fora do modo standalone (`!navigator.standalone`), mostra uma vez a dica "Para instalar: toca em Partilhar e depois em Adicionar ao ecrã principal.", com "Fechar". O fecho fica guardado em localStorage.
- Chama `navigator.storage?.persist?.()`.

- [ ] **Passo 5: executar `npm run e2e`. Esperado: todos PASS.**

- [ ] **Passo 6: fazer commit, `git commit -m "PWA: service worker offline, manifesto, ícones e aviso de atualização"`**

---

### Task 3: Regra de acesso (prazo offline)

**Ficheiros:**
- Criar: `src/access/lease.js`, `tests/lease.test.mjs`

**Interfaces:**
- Produz:
  - `LEASE_DAYS = 7`
  - `CLOCK_SKEW_MS = 5 * 60 * 1000`
  - `accessStatus({ signedIn: boolean, lastVerifiedAt: number|null, now: number }) -> { state: 'signed-out'|'ok'|'expired', expiresAt: number|null }`
  - `loadLease(storage, email) -> number|null` e `saveLease(storage, email, at) / clearLease(storage)`, sobre a chave `flechas-acesso` com `{ email, lastVerifiedAt }`. Um email diferente devolve `null`.

- [ ] **Passo 1: escrever o teste que falha, `tests/lease.test.mjs`**

```js
const D = 86400000, t0 = Date.UTC(2026, 10, 13);
test('sem sessão', () => assert.equal(accessStatus({ signedIn: false, lastVerifiedAt: t0, now: t0 }).state, 'signed-out'));
test('nunca verificado', () => assert.equal(accessStatus({ signedIn: true, lastVerifiedAt: null, now: t0 }).state, 'expired'));
test('dentro do prazo', () => {
  const r = accessStatus({ signedIn: true, lastVerifiedAt: t0, now: t0 + 7 * D - 1 });
  assert.equal(r.state, 'ok'); assert.equal(r.expiresAt, t0 + 7 * D);
});
test('prazo esgotado', () => assert.equal(accessStatus({ signedIn: true, lastVerifiedAt: t0, now: t0 + 7 * D + 1 }).state, 'expired'));
test('relógio atrasado mais de 5 min conta como expirado', () =>
  assert.equal(accessStatus({ signedIn: true, lastVerifiedAt: t0, now: t0 - CLOCK_SKEW_MS - 1 }).state, 'expired'));
test('relógio atrasado menos de 5 min é tolerado', () =>
  assert.equal(accessStatus({ signedIn: true, lastVerifiedAt: t0, now: t0 - 1000 }).state, 'ok'));
test('prazo guardado é por email', () => {
  const s = new Map(); const st = { getItem: k => s.get(k) ?? null, setItem: (k, v) => s.set(k, v), removeItem: k => s.delete(k) };
  saveLease(st, 'a@x.pt', t0); assert.equal(loadLease(st, 'a@x.pt'), t0); assert.equal(loadLease(st, 'b@x.pt'), null);
});
```

- [ ] **Passo 2: executar `npm test` e confirmar que falha (módulo em falta)**
- [ ] **Passo 3: implementar `src/access/lease.js` com as assinaturas acima**
- [ ] **Passo 4: executar `npm test`. Esperado: PASS.**
- [ ] **Passo 5: fazer commit, `git commit -m "Acesso: regra do prazo offline de 7 dias"`**

---

### Task 4: Login, verificação e bloqueio

**Ficheiros:**
- Criar: `src/access/auth-firebase.js`, `src/access/auth-fake.js`, `src/access/firebase-config.js`, `src/access/gate.js`, `.env.e2e`, `e2e/access.spec.mjs`, `docs/configuracao.md`
- Modificar: `index.html` (secções `#login`, `#locked` e o menu de conta), `src/main.js`, `src/styles.css`, `playwright.config.mjs`. O `webServer` passa a executar `vite build --mode e2e`.

**Interfaces:**
- Consome: `accessStatus`, `loadLease`, `saveLease` e `clearLease` (Tarefa 3), e `mountCalc` (Tarefa 1).
- Produz:
  - Adaptador `Auth`, devolvido por `createAuth()` em ambos os ficheiros `auth-*.js`:
    - `currentUser(): Promise<{ email: string } | null>`: resolve depois de a persistência ser restaurada.
    - `signIn(email, password): Promise<void>`: lança um `Error` com `.code` igual a `'invalid-credentials'`, `'disabled'`, `'offline'` ou `'other'`.
    - `signOut(): Promise<void>`
    - `resetPassword(email): Promise<void>`
    - `verify(): Promise<'ok' | 'revoked' | 'offline'>`
  - `startGate({ auth, storage = localStorage, now = Date.now, onUnlock: () => void }): void`

- [ ] **Passo 1: escrever o e2e `e2e/access.spec.mjs` (falha)**

O `auth-fake.js` lê `localStorage['fake-auth']`, com o formato `{ users: { [email]: { password, disabled } }, session: email|null }`. Quando `navigator.onLine` é falso, `signIn` lança `offline` e `verify` devolve `'offline'`.

```js
const seed = (page, data) => page.addInitScript(d => localStorage.setItem('fake-auth', JSON.stringify(d)), data);
const U = { users: { 'ana@x.pt': { password: 'segredo1', disabled: false } }, session: null };
test('login certo mostra a calculadora', async ({ page }) => {
  await seed(page, U); await page.goto('/');
  await page.fill('#login-email', 'ana@x.pt'); await page.fill('#login-pass', 'segredo1'); await page.click('#login-go');
  await expect(page.locator('#calc')).toBeVisible();
});
test('palavra-passe errada', async ({ page }) => {
  await seed(page, U); await page.goto('/');
  await page.fill('#login-email', 'ana@x.pt'); await page.fill('#login-pass', 'x'); await page.click('#login-go');
  await expect(page.locator('#login-msg')).toHaveText('Email ou palavra-passe errados.');
});
test('conta desativada com sessão aberta: volta ao login com aviso', async ({ page }) => {
  await seed(page, { users: { 'ana@x.pt': { password: 'segredo1', disabled: true } }, session: 'ana@x.pt' });
  await page.goto('/');
  await expect(page.locator('#login-msg')).toHaveText('A tua conta foi desativada. Fala com o administrador.');
  await expect(page.locator('#calc')).toBeHidden();
});
test('offline dentro do prazo: abre', async ({ page, context }) => {
  await seed(page, { ...U, session: 'ana@x.pt' });
  await page.addInitScript(() => localStorage.setItem('flechas-acesso', JSON.stringify({ email: 'ana@x.pt', lastVerifiedAt: Date.now() - 86400000 })));
  await page.goto('/'); await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true); await page.reload();
  await expect(page.locator('#calc')).toBeVisible();
});
test('offline com prazo esgotado: bloqueado', async ({ page, context }) => {
  await seed(page, { ...U, session: 'ana@x.pt' });
  await page.addInitScript(() => localStorage.setItem('flechas-acesso', JSON.stringify({ email: 'ana@x.pt', lastVerifiedAt: Date.now() - 8 * 86400000 })));
  await page.goto('/'); await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true); await page.reload();
  await expect(page.locator('#locked')).toContainText('Liga-te à internet para confirmar o teu acesso.');
});
test('primeiro arranque sem rede e sem sessão', async ({ page, context }) => {
  await seed(page, U); await page.goto('/'); await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true); await page.reload();
  await page.fill('#login-email', 'ana@x.pt'); await page.fill('#login-pass', 'segredo1'); await page.click('#login-go');
  await expect(page.locator('#login-msg')).toHaveText('Para entrar precisas de internet.');
});
```

Atenção: nos testes offline, o `addInitScript` volta a correr no `reload` e repõe o prazo. É o comportamento pretendido. O `reload` deve servir a partir do service worker (Tarefa 2).

- [ ] **Passo 2: executar o e2e e confirmar que falha**

- [ ] **Passo 3: implementar o `auth-firebase.js`**

- `initializeApp(firebaseConfig)` e `initializeAuth(app, { persistence: indexedDBLocalPersistence })`. Não se usa `getAuth`, porque o resolver de popups dá problemas no WebView do Capacitor.
- `currentUser` espera por `auth.authStateReady()`.
- Mapa de erros:
  - `auth/invalid-credential`, `auth/wrong-password`, `auth/user-not-found` e `auth/invalid-email` → `invalid-credentials`
  - `auth/user-disabled` → `disabled`
  - `auth/network-request-failed` → `offline`
  - restantes → `other`
- `verify()` chama `auth.currentUser.getIdToken(true)`:
  - sucesso → `'ok'`
  - `auth/user-disabled`, `auth/user-token-expired`, `auth/user-not-found` ou `auth/invalid-user-token` → `'revoked'`
  - **qualquer outro erro → `'offline'`.** Um erro desconhecido nunca bloqueia ninguém no terreno.
- Em `firebase-config.js` ficam os valores públicos do projeto Firebase. Até haver projeto, levam o marcador `'PREENCHER'`, e o `createAuth` lança "Configuração do Firebase em falta (ver docs/configuracao.md)".

- [ ] **Passo 4: implementar o `auth-fake.js` (comportamento descrito no Passo 1) e o `.env.e2e` (`VITE_AUTH=fake`)**

`main.js` escolhe o adaptador com `import.meta.env.VITE_AUTH === 'fake'`, usando import dinâmico para o fake não entrar no build normal.

- [ ] **Passo 5: implementar o `startGate` em `gate.js`**

Fluxo:
1. `user = await auth.currentUser()`. Se não houver, mostra o login.
2. Se houver utilizador e `navigator.onLine`, chama `await auth.verify()`:
   - `ok` → `saveLease(now())`
   - `revoked` → `signOut`, `clearLease`, login com a mensagem de conta desativada
3. Calcula o `accessStatus`:
   - `ok` → `onUnlock()`, só uma vez
   - `expired` → mostra `#locked` com o botão "Tentar novamente", que repete o passo 2
4. Volta a verificar no evento `online`, no `visibilitychange` para visível e a cada 6 h. Um `revoked` a meio de uma utilização bloqueia logo.
5. O login bem-sucedido chama `verify` e grava o prazo.
6. "Esqueci-me da palavra-passe" chama `resetPassword` e mostra "Se o email existir, vais receber um link para definir a palavra-passe."
7. No menu de conta aparecem o email, "Acesso confirmado até <data pt-PT>" e "Sair".

Mensagens exatas:
- `invalid-credentials`: "Email ou palavra-passe errados."
- `disabled`/`revoked`: "A tua conta foi desativada. Fala com o administrador."
- `offline` no login: "Para entrar precisas de internet."
- `other`: "Não foi possível entrar. Tenta outra vez."

- [ ] **Passo 6: executar `npm test && npm run e2e`. Esperado: todos PASS.** Os e2e das Tarefas 1 e 2 passam a precisar de uma sessão fake: acrescentar `seed` com sessão e prazo válidos num `beforeEach` desses ficheiros.

- [ ] **Passo 7: escrever a primeira parte do `docs/configuracao.md`, em português e passo a passo, para o Batista**

Passos a cobrir:
1. Criar o projeto Firebase, no plano Spark e sem cartão.
2. Authentication → ativar Email/Palavra-passe.
3. Authentication → Definições → Ações do utilizador → desligar "Ativar criação (registo)".
4. Copiar a configuração web para `src/access/firebase-config.js`.
5. Criar um utilizador: Adicionar utilizador com uma palavra-passe temporária. A pessoa usa depois "Esqueci-me da palavra-passe" para definir a sua.
6. Cortar o acesso: Desativar conta.
7. Comprovar que o registo público está desligado com este comando, que tem de responder `ADMIN_ONLY_OPERATION`:
   `curl -s -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=<apiKey>" -H 'Content-Type: application/json' -d '{"email":"teste@exemplo.pt","password":"teste123","returnSecureToken":true}'`

- [ ] **Passo 8: fazer commit, `git commit -m "Acesso: login Firebase, verificação, bloqueio offline e guia de configuração"`**

---

### Task 5: Histórico local (armazenamento e exportação)

**Ficheiros:**
- Criar: `src/history/store.js`, `src/history/export.js`, `tests/history.test.mjs`
- Dependências: `idb` e, para desenvolvimento, `fake-indexeddb`

**Interfaces:**
- Formato de um `Record`: `{ id: string (crypto.randomUUID), savedAt: string ISO, vao: string, cabo: string, method: 'int'|'pt', inputs: object (o estado cru do formulário, getState()), result: { a, ft, flecha, desvio, conforme, p } }`
- `store.js`, numa base IndexedDB `flechas`, versão 1, com o store `medicoes` e keyPath `id`:
  - `openHistory(idbFactory = globalThis.indexedDB) -> Promise<History|null>`. Devolve `null` quando o IndexedDB não está disponível ou falha.
  - `History`: `add(rec)`, `list() -> Record[]` (o mais recente primeiro), `remove(id)`, `importMany(recs) -> { added, skipped }`. Um id já existente é ignorado e o registo existente prevalece.
- `export.js` (funções puras):
  - `toJSON(records, now) -> string`, no formato `{ app: 'flechas', versao: 1, exportadoEm, medicoes }`
  - `parseImport(text) -> { records: Record[], invalid: number }`. Lança `Error('Ficheiro não é uma exportação da app Flechas.')` se o JSON for inválido ou se `app !== 'flechas'`.
  - `toCSV(records) -> string`, com BOM UTF-8, separador `;`, decimais com vírgula e cabeçalho `data;vao;cabo;metodo;vao_m;flecha_teorica_m;flecha_medida_m;desvio_pct;resultado`. A data vem no formato `AAAA-MM-DD HH:MM` (hora local), `metodo` é `Internacional` ou `Português`, `resultado` é `Conforme` ou `Não conforme`, e a flecha leva 3 casas decimais e o desvio 2.

- [ ] **Passo 1: escrever o teste que falha, `tests/history.test.mjs`**

Usar `import { IDBFactory } from 'fake-indexeddb'` com uma `new IDBFactory()` por teste.

```js
const rec = (id, savedAt) => ({ id, savedAt, vao: '9-10', cabo: 'CC1', method: 'pt', inputs: { a: '417,36' },
  result: { a: 417.36, ft: 14.83, flecha: 14.689865, desvio: -0.00954, conforme: true, p: 1484.84 } });
test('add, list (mais recente primeiro) e remove', async () => {
  const h = await openHistory(new IDBFactory());
  await h.add(rec('a', '2026-11-13T10:00:00Z')); await h.add(rec('b', '2026-11-13T11:00:00Z'));
  assert.deepEqual((await h.list()).map(r => r.id), ['b', 'a']);
  await h.remove('a'); assert.deepEqual((await h.list()).map(r => r.id), ['b']);
});
test('importMany não duplica e mantém o existente', async () => {
  const h = await openHistory(new IDBFactory()); await h.add(rec('a', '2026-11-13T10:00:00Z'));
  const r = await h.importMany([{ ...rec('a', '2026-11-13T10:00:00Z'), vao: 'outro' }, rec('c', '2026-11-13T12:00:00Z')]);
  assert.deepEqual(r, { added: 1, skipped: 1 }); assert.equal((await h.list()).find(x => x.id === 'a').vao, '9-10');
});
test('sem IndexedDB devolve null', async () => assert.equal(await openHistory(undefined), null));
test('JSON ida e volta', () => {
  const txt = toJSON([rec('a', '2026-11-13T10:00:00Z')], new Date('2026-11-13T12:00:00Z'));
  assert.deepEqual(parseImport(txt), { records: [rec('a', '2026-11-13T10:00:00Z')], invalid: 0 });
});
test('importar ficheiro estranho', () => {
  assert.throws(() => parseImport('não é json'), /não é uma exportação/);
  assert.throws(() => parseImport('{"app":"outra","medicoes":[]}'), /não é uma exportação/);
  assert.equal(parseImport('{"app":"flechas","versao":1,"medicoes":[{"id":1}]}').invalid, 1);
});
test('CSV para Excel PT', () => {
  const lines = toCSV([rec('a', '2026-11-13T10:00:00Z')]).replace(/^﻿/, '').trim().split('\r\n');
  assert.equal(lines[0], 'data;vao;cabo;metodo;vao_m;flecha_teorica_m;flecha_medida_m;desvio_pct;resultado');
  assert.match(lines[1], /;9-10;CC1;Português;417,36;14,83;14,690;-0,95;Conforme$/);
});
```

Um registo só é válido se tiver `id` em string, `savedAt` em string, `method` igual a `int` ou `pt` e `inputs` como objeto.

- [ ] **Passo 2: executar `npm test` e confirmar que falha**
- [ ] **Passo 3: implementar o `store.js` (com `idb`, aceitando a `idbFactory` injetada) e o `export.js`**
- [ ] **Passo 4: executar `npm test`. Esperado: PASS.**
- [ ] **Passo 5: fazer commit, `git commit -m "Histórico: armazenamento IndexedDB e exportação JSON/CSV"`**

---

### Task 6: Histórico na interface

**Ficheiros:**
- Criar: `src/history/ui.js`, `src/platform/files.js`, `e2e/history.spec.mjs`
- Modificar: `index.html` (botões "Guardar medição" e "Histórico", diálogo de gravação, painel do histórico), `src/main.js`, `src/styles.css`

**Interfaces:**
- Consome: `openHistory`, `toJSON`, `toCSV` e `parseImport` (Tarefa 5), e `getState`, `setState` e `lastResult` de `mountCalc` (Tarefa 1).
- Produz:
  - `mountHistory({ calc, history: History|null }): void`
  - `saveFile(name: string, text: string, mime: string): Promise<void>`. Na web usa Blob e `a[download]`. O ramo nativo é acrescentado na Tarefa 7.

- [ ] **Passo 1: escrever o e2e `e2e/history.spec.mjs` (falha), com a sessão fake semeada como na Tarefa 4**

Casos:
- **Guardar** o exemplo português com Vão `9-10` e Cabo `CC1`: o painel "Histórico" mostra uma linha com `9-10`, `CC1`, `14,69` e `Conforme`.
- **"Abrir"** essa linha depois de "Nova medição": o formulário volta a mostrar `417,36` em `#a`, e `#r-big` volta a ter o mesmo valor.
- **"Apagar"** (aceitando o `confirm`): a lista fica vazia, com o texto "Ainda não há medições guardadas."
- **Exportar JSON:** `page.waitForEvent('download')` dá um ficheiro `flechas-AAAA-MM-DD.json`. Importar esse ficheiro com `setInputFiles('#hist-import', …)` num perfil limpo recria a linha e mostra "1 medição importada."
- **Importar um ficheiro inválido** mostra "Ficheiro não é uma exportação da app Flechas." e não altera a lista.
- **Sem resultado válido** (formulário vazio), "Guardar medição" fica desativado.

- [ ] **Passo 2: executar o e2e e confirmar que falha**

- [ ] **Passo 3: implementar o `mountHistory` e o `saveFile` web**

- O diálogo de gravação tem o campo de texto "Vão" (exemplo "9-10") e o select "Cabo" com CC1–CC6, CG1, CG2 e Outro. Os dois guardam o último valor usado.
- Cada linha da lista mostra `vao · cabo · flecha m · Conforme/Não conforme · dd/mm hh:mm`, com as ações "Abrir" e "Apagar".
- No rodapé ficam "Exportar JSON", "Exportar CSV" e "Importar" (`<input type=file accept=application/json id=hist-import>`).
- Com `history === null`, o painel mostra "Não é possível guardar medições neste browser (por exemplo, em navegação privada). A calculadora continua a funcionar." e os botões de gravar e importar ficam desativados.

- [ ] **Passo 4: executar `npm run e2e`. Esperado: todos PASS.**
- [ ] **Passo 5: fazer commit, `git commit -m "Histórico: guardar, abrir, apagar, exportar e importar medições"`**

---

### Task 7: APK Android, aviso de versão, CI/CD e documentação

**Ficheiros:**
- Criar: `capacitor.config.json`, `android/` (gerado por `npx cap add android` e incluído no git), `src/update/check.js`, `tests/update.test.mjs`, `public/version.json`, `firebase.json`, `.firebaserc`, `.github/workflows/ci.yml`, `.github/workflows/release.yml`
- Modificar: `src/platform/files.js`, `src/main.js`, `vite.config.js` (`define: { __APP_VERSION__: JSON.stringify(pkg.version) }`), `docs/configuracao.md`, `README.md`, `CLAUDE.md`

**Interfaces:**
- `src/update/check.js`:
  - `isNewer(remote: string, local: string) -> boolean` (semver `x.y.z`)
  - `checkApkUpdate({ fetchImpl = fetch, baseUrl = import.meta.env.VITE_HOSTING_URL, local = __APP_VERSION__, native = Capacitor.isNativePlatform() }) -> Promise<{ version, apk } | null>`. Devolve `null` de imediato quando `native` é falso. Qualquer erro devolve `null`.
- `public/version.json` tem o formato `{ "version": "x.y.z", "apk": "/flechas.apk" }` e é gerado no release.

- [ ] **Passo 1: escrever o teste que falha, `tests/update.test.mjs`**

```js
test('isNewer', () => {
  assert.equal(isNewer('1.2.0', '1.1.9'), true); assert.equal(isNewer('1.10.0', '1.9.0'), true);
  assert.equal(isNewer('1.2.0', '1.2.0'), false); assert.equal(isNewer('lixo', '1.0.0'), false);
});
test('checkApkUpdate devolve null se o fetch falhar', async () => {
  assert.equal(await checkApkUpdate({ fetchImpl: () => Promise.reject(new Error('x')), baseUrl: 'https://x', local: '1.0.0', native: true }), null);
});
```

- [ ] **Passo 2: executar `npm test` e confirmar que falha. Depois implementar o `check.js` e executar de novo. Esperado: PASS.**

- [ ] **Passo 3: adicionar o Capacitor**

- `appId: 'pt.flechas.app'`, `appName: 'Flechas'`, `webDir: 'dist'`. Correr `npx cap add android`.
- No `android/app/build.gradle`:
  - `versionName` vem de `package.json`
  - `versionCode` vem da variável `VERSION_CODE`, com 1 por omissão
  - `signingConfigs.release` lê `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` e `ANDROID_KEY_PASSWORD` das variáveis de ambiente
- No `main.js`, quando a app corre no Capacitor e `checkApkUpdate` devolve uma versão, aparece a faixa "Há uma versão nova da app (x.y.z)." com o link "Descarregar", que abre `baseUrl + apk` no browser do sistema.
- O `saveFile` nativo escreve em `Directory.Cache` com `@capacitor/filesystem` e abre `Share.share({ url })`.

- [ ] **Passo 4: escrever o `firebase.json`**

- `hosting.public: "dist"`, com rewrite de `**` para `/index.html`.
- `headers`:
  - `/version.json` → `Access-Control-Allow-Origin: *` e `Cache-Control: no-cache`, porque o APK corre em `https://localhost`
  - `/sw.js` → `Cache-Control: no-cache`
  - `/flechas.apk` → `Content-Type: application/vnd.android.package-archive`

- [ ] **Passo 5: escrever o `.github/workflows/ci.yml`**

Corre em `push` e `pull_request`, em ubuntu-latest com Node 22. Executa `npm ci`, `npm test`, `npx playwright install --with-deps chromium` e `npm run e2e`.

- [ ] **Passo 6: escrever o `.github/workflows/release.yml`**

- Corre em `push` para `main` e em `workflow_dispatch`.
- Faz o mesmo que o CI e depois:
  1. `npm run build`
  2. `npx cap sync android`
  3. Setup Java 21 e `./gradlew assembleRelease` com `VERSION_CODE=${{ github.run_number }}` e o keystore descodificado de `secrets.ANDROID_KEYSTORE_BASE64`
  4. Copia o APK para `dist/flechas.apk` e escreve `dist/version.json`
  5. `FirebaseExtended/action-hosting-deploy` com `channelId: live`, `projectId` de `.firebaserc` e `firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}`
- `VITE_HOSTING_URL` vem de `vars.HOSTING_URL`.
- **Se faltar algum segredo, o job falha com uma mensagem a apontar para `docs/configuracao.md`.** Não publica nada parcial.

- [ ] **Passo 7: verificar localmente**

Executar `npm test && npm run build && npx cap sync android`. Esperado: sem erros. Neste contentor não há Android SDK, por isso a compilação do APK é verificada no primeiro run do `release.yml`.

- [ ] **Passo 8: completar o `docs/configuracao.md`**

- Gerar o keystore com `keytool -genkeypair -v -keystore flechas.jks -alias flechas -keyalg RSA -keysize 2048 -validity 10000`, num computador com Java (não o da REN). Avisar que, se a chave se perder, os telemóveis deixam de aceitar atualizações.
- Converter o keystore para base64 e criar os 4 segredos `ANDROID_*` no GitHub.
- Criar a conta de serviço com o papel "Firebase Hosting Admin", guardar a chave JSON no segredo `FIREBASE_SERVICE_ACCOUNT` e criar a variável `HOSTING_URL`.
- Instalar no iPhone: Safari → link → Partilhar → Adicionar ao ecrã principal.
- Instalar no Android: o link `/flechas.apk`, autorizando "instalar apps desconhecidas".

Atualizar o `README.md` (estrutura, comandos e o `app/calculadora-flechas.html` como versão antiga). No `CLAUDE.md`, substituir a regra "Offline e local" por: "Só o login (Firebase Auth) usa a rede; as medições nunca saem do aparelho; a app funciona offline até 7 dias sem verificação." Atualizar também o "Estado atual".

- [ ] **Passo 9: fazer commit, `git commit -m "APK Android com Capacitor, aviso de versão, CI/CD e guia de configuração"`**
