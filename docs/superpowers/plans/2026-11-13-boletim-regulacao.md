# Boletim do vão, regulação e flecha pela temperatura — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** acrescentar o boletim do vão (8 cabos), o modo de regulação (parâmetro → leitura a apontar) e a flecha teórica pela tabela com correção de temperatura, otimizados para telemóvel e tablet.

**Architecture:**
- O cálculo de um cabo sai de `src/calc/app.js` para uma função pura, `computeCabo(S)`, em `src/calc/compute.js`, já com o modo de regulação. A vista cabo a cabo e o boletim usam ambos essa função.
- A temperatura e a interpolação ficam num módulo puro, `src/calc/temperatura.js`.
- O boletim divide-se em estado e mapeamento puros (`src/boletim/state.js`) e interface (`src/boletim/ui.js`), com uma tabela no tablet e separadores no telemóvel.

**Tech Stack:** a do ramo `claude/pwa-apk` (Vite, `node --test`, Playwright). Sem dependências novas.

**Spec:** `docs/superpowers/specs/2026-11-13-boletim-regulacao-design.md`

## Global Constraints

- `core/flechas-core.mjs` e `tests/casos-validacao.json` não mudam. Todos os testes existentes continuam a passar.
- Nenhum pedido de rede novo.
- `Tc = Tlocal − correção(grupo)`, com uma correção vazia valendo 0. Grupo CC = CC1–CC6 e grupo CG = CG1 e CG2.
- **Tabela:** se `Tc` é múltiplo de 5 (|Tc − 5·round(Tc/5)| < 1e-9), pede-se 1 valor, `v(Tc)`. Se não, pedem-se `v(T₀)` e `v(T₀+5)`, com `T₀ = 5·⌊Tc/5⌋`, e interpola-se linearmente.
- O que se interpola: a **flecha** na verificação e o **parâmetro** na regulação.
- **Correspondência cabo → braço** (método português): CC1/CC2 → `sup`, CC3/CC4 → `med`, CC5/CC6 → `hu`, CG1/CG2 → `ht`.
- **Textos de interface:**
  - modos "Verificação" e "Regulação"; vistas "Cabo a cabo" e "Boletim do vão";
  - etiquetas da tabela "Flecha a {T} °C" e "Parâmetro a {T} °C", com T formatado em pt-PT e sem casas decimais;
  - resultado da regulação "Leitura a apontar".
- **Chaves de armazenamento novas:**
  - `flechas-temp-dia`: `{ data: 'AAAA-MM-DD', valor }`
  - `flechas-correcoes`: `{ CC, CG }`
  - `flechas-boletim-v1`: rascunho do boletim
- **Viewports dos e2e:** telemóvel 390 × 844, tablet na vertical 800 × 1280, tablet na horizontal 1280 × 800.

## Review Focus

1. **Temperatura de cálculo com decimais ou negativa** (17,5 °C; −3 °C). Pede as linhas certas (15/20; −5/0), e as etiquetas e a interpolação batem certo. Testes na Tarefa 1.
2. **Mudar a temperatura depois de preencher a tabela.** Os valores já escritos para cada temperatura ficam guardados (o mapa é por temperatura), e os campos pedidos mudam sem apagar nada. e2e na Tarefa 3.
3. **Cabo sem valor próprio quando o do grupo muda.** O cabo segue o grupo. Um cabo com valor próprio não segue. Teste na Tarefa 4.
4. **Tablet a rodar a meio de um boletim.** Os dados não se perdem e a vista adapta-se. e2e na Tarefa 5.
5. **Registo antigo (sem `kind`) importado ou reaberto.** Continua a abrir na vista cabo a cabo. Teste na Tarefa 6.

---

### Task 1: Temperatura e interpolação

**Files:**
- Create: `src/calc/temperatura.js`, `tests/temperatura.test.mjs`

**Interfaces:**
- Produz:
  - `grupoDoCabo(cabo: string) -> 'CC'|'CG'`
  - `bracoDoCabo(cabo) -> 'sup'|'med'|'hu'|'ht'`
  - `CABOS = ['CC1','CC2','CC3','CC4','CC5','CC6','CG1','CG2']`
  - `tempCalculo(tLocal: number, corr: number) -> number`, em que uma `corr` NaN conta como 0 e uma `tLocal` NaN dá NaN
  - `linhasTabela(Tc: number) -> number[]`, com 1 ou 2 temperaturas, ou `[]` se Tc for NaN
  - `resolverTeorico(spec: { tipo: 'direta'|'tabela', direta: string, tabela: { [T: string]: string } }, Tc: number) -> number`, NaN se faltar algum valor
  - `temperaturaDoDia(storage, hoje: string) -> string` e `lembrarTemperatura(storage, valor: string, hoje: string)`
  - `lerCorrecoes(storage) -> { CC: string, CG: string }` e `guardarCorrecoes(storage, { CC, CG })`

- [ ] **Step 1: Escrever os testes que falham**

```js
test('grupo e braço por cabo', () => {
  assert.equal(grupoDoCabo('CC4'), 'CC'); assert.equal(grupoDoCabo('CG2'), 'CG');
  assert.deepEqual(['CC1','CC2','CC3','CC4','CC5','CC6','CG1','CG2'].map(bracoDoCabo), ['sup','sup','med','med','hu','hu','ht','ht']);
});
test('Tc = Tlocal − correção; correção vazia conta 0', () => {
  assert.equal(tempCalculo(15, 10), 5); assert.equal(tempCalculo(15, NaN), 15); assert.ok(Number.isNaN(tempCalculo(NaN, 10)));
});
test('linhas da tabela', () => {
  assert.deepEqual(linhasTabela(5), [5]); assert.deepEqual(linhasTabela(0), [0]); assert.deepEqual(linhasTabela(7), [5, 10]);
  assert.deepEqual(linhasTabela(17.5), [15, 20]); assert.deepEqual(linhasTabela(-3), [-5, 0]); assert.deepEqual(linhasTabela(NaN), []);
  assert.deepEqual(linhasTabela(5.0000000001), [5]);
});
test('resolverTeorico direta e pela tabela', () => {
  assert.equal(resolverTeorico({ tipo: 'direta', direta: '12,79', tabela: {} }, 7), 12.79);
  assert.equal(resolverTeorico({ tipo: 'tabela', direta: '', tabela: { '5': '12,79' } }, 5), 12.79);
  assert.ok(Math.abs(resolverTeorico({ tipo: 'tabela', direta: '', tabela: { '5': '12,00', '10': '13,00' } }, 7) - 12.4) < 1e-12);
  assert.ok(Math.abs(resolverTeorico({ tipo: 'tabela', direta: '', tabela: { '-5': '10', '0': '11' } }, -3) - 10.4) < 1e-12);
  assert.ok(Number.isNaN(resolverTeorico({ tipo: 'tabela', direta: '', tabela: { '5': '12' } }, 7)));
});
test('temperatura do dia só vale no mesmo dia', () => {
  const st = memStorage(); lembrarTemperatura(st, '17', '2026-11-13');
  assert.equal(temperaturaDoDia(st, '2026-11-13'), '17'); assert.equal(temperaturaDoDia(st, '2026-11-14'), '');
});
test('correções guardadas', () => {
  const st = memStorage(); assert.deepEqual(lerCorrecoes(st), { CC: '', CG: '' });
  guardarCorrecoes(st, { CC: '10', CG: '5' }); assert.deepEqual(lerCorrecoes(st), { CC: '10', CG: '5' });
});
```

O `memStorage` é o mesmo de `tests/lease.test.mjs`. As chaves do mapa da tabela são `String(T)`.

- [ ] **Step 2: Executar `npm test` e confirmar que falha (módulo em falta)**
- [ ] **Step 3: Implementar `src/calc/temperatura.js` (usa `parseNum` de `src/num.js`)**
- [ ] **Step 4: Executar `npm test`. Esperado: tudo PASS.**
- [ ] **Step 5: Commit `"Temperatura de cálculo, linhas da tabela e interpolação"`**

---

### Task 2: Cálculo de um cabo como função pura, com regulação

**Files:**
- Create: `src/calc/compute.js`, `tests/compute.test.mjs`
- Modify: `src/calc/app.js`. O `compute` e as constantes de que depende (`IDS`, `NAMES`, `NOTES` ficam na interface) saem daqui, e a `render` passa a chamar `computeCabo`.

**Interfaces:**
- Consome: o núcleo e `src/num.js`.
- Produz: `computeCabo(S) -> R`, com o mesmo `R` do `compute` atual mais `R.modo` e, em regulação, `R.reg = { p, f, z, zMin, zMax }`.
  - `S` é o estado do formulário em strings, com os campos de hoje (`method, a, dp, t, H, HS, perna, cad, z1, z2, cota, F, zf, z, temp, ft, tolA, tolB`) mais `modo: 'ver'|'reg'` e `preg` (o parâmetro, em string).
  - Em **regulação**:
    - ignora `z` e `ft`;
    - usa `pT = parseNum(preg)` e `ft = fn(a, d, pT)`;
    - preenche `R.theo` como hoje (com `pT` dado, sem `pFromSag`) e `R.reg = { p: pT, f: ft, z: R.theo.zT, zMin: R.theo.zMin, zMax: R.theo.zMax }`;
    - com um parâmetro em falta, a mensagem de "falta" inclui "o parâmetro";
    - com o parâmetro ≤ 0, dá o erro "O parâmetro tem de ser maior que zero."

- [ ] **Step 1: Escrever os testes que falham, `tests/compute.test.mjs`**

```js
import casos from './casos-validacao.json' with { type: 'json' };
const S0 = { method: 'pt', modo: 'ver', a: '', dp: '', t: '', H: '', HS: '', perna: '', cad: '', z1: '', z2: '', cota: '', F: '', zf: '', z: '', temp: '', ft: '', preg: '', tolA: '2,5', tolB: '1,5' };
const sPT = c => ({ ...S0, a: String(c.a), F: String(c.F), cota: String(c.cota), H: String(c.H), HS: String(c.HS), perna: String(c.perna), cad: String(c.cadeia), zf: String(c.zf), z: String(c.z), ft: String(c.ft) });
for (const c of casos.folha_lbl) test(`verificação igual ao núcleo: ${c.id}`, () => {
  const R = computeCabo(sPT(c)); const ref = calcularCabo('pt', c);
  assert.ok(Math.abs(R.meas.p - ref.p) < 1e-6); assert.ok(Math.abs(R.verdict.f - ref.flecha) < 1e-9); assert.equal(R.verdict.ok, ref.conforme);
});
test('regulação: o parâmetro medido dá de volta a leitura medida', () => {
  const c = casos.folha_lbl[0]; const p = calcularCabo('pt', c).p;
  const R = computeCabo({ ...sPT(c), modo: 'reg', preg: String(p), z: '', ft: '' });
  assert.ok(Math.abs(R.reg.z - c.z) < 1e-6); assert.ok(Math.abs(R.reg.f - c.esperado.flecha) < 1e-6);
  assert.ok(R.reg.zMin < R.reg.z && R.reg.z < R.reg.zMax); assert.equal(R.verdict, undefined);
});
test('regulação internacional (exemplo da app)', () => {
  const base = { ...S0, method: 'int', a: '425,48', t: '60', z1: '59,5046', z2: '81,6059' };
  const p = computeCabo({ ...base, z: '82,1749' }).meas.p;
  assert.ok(Math.abs(computeCabo({ ...base, modo: 'reg', preg: String(p) }).reg.z - 82.1749) < 1e-6);
});
test('regulação sem parâmetro pede-o; parâmetro negativo é erro', () => {
  const c = casos.folha_lbl[0];
  assert.ok(computeCabo({ ...sPT(c), modo: 'reg', preg: '' }).missing.includes('o parâmetro'));
  assert.ok(computeCabo({ ...sPT(c), modo: 'reg', preg: '-5' }).errors.includes('O parâmetro tem de ser maior que zero.'));
});
```

- [ ] **Step 2: Executar `npm test` e confirmar que falha**

- [ ] **Step 3: Mover o `compute` para `src/calc/compute.js`**
  - Exporta `computeCabo`, e as `NAMES` passam a incluir `preg: 'o parâmetro'`.
  - Acrescentar o ramo de regulação descrito em Interfaces.
  - No `app.js`, a `render` chama `computeCabo({...S, modo, preg})`. O modo e o parâmetro só ganham interface na Tarefa 3; até lá, `modo: 'ver'`.

- [ ] **Step 4: Executar `npm test && npm run e2e`. Esperado: tudo PASS, incluindo os e2e de cálculo, porque a interface não muda.**

- [ ] **Step 5: Commit `"Cálculo de um cabo como função pura, com modo de regulação"`**

---

### Task 3: Vista cabo a cabo — cabo, temperatura, tabela e regulação

**Files:**
- Modify: `index.html`, `src/calc/app.js`, `src/styles.css`, `src/history/ui.js`
- Create: `e2e/cabo.spec.mjs`

**Interfaces:**
- Consome: Tarefas 1 e 2.
- Produz:
  - Barra de topo partilhada com `#vista-cabo` e `#vista-boletim` (botões de vista; o boletim só é ligado na Tarefa 5) e `#modo-ver` e `#modo-reg` (rádios).
  - Novos campos no estado do formulário (chave `flechas-verificacao-v3`, mantendo a compatibilidade):
    - `cabo` (CC1…CG2), `corr`, `teorTipo` ('direta'|'tabela'), `teorTab` (objeto T → valor);
    - `preg`, `pregTipo` e `pregTab`, o mesmo para o parâmetro;
    - `temp` passa a ser a temperatura local.
  - `mountCalc(...).lastResult()` passa a incluir `{ modo, cabo, tLocal, tc, reg }`.

- [ ] **Step 1: Escrever o e2e `e2e/cabo.spec.mjs` (falha), com a sessão `signedIn`**
  - Escolher o cabo `CG1` no método português põe o braço em "Topo, cabo de guarda (Ht)".
  - **Correção pelo cabo:** com temperatura 15 e cabo CC1, escrever a correção 10 mostra "Temperatura de cálculo 5 °C". Mudar para CG1 mostra o campo de correção dos CG (vazio) e "15 °C".
  - **Tabela:**
    - com "Pela tabela" e Tc = 5, aparece um campo só, "Flecha a 5 °C";
    - com Tc = 7, aparecem "Flecha a 5 °C" e "Flecha a 10 °C";
    - com 12,00 e 13,00 escritos, o resultado usa a teórica 12,40, que se lê no texto `#r-sub`.
  - **Review Focus 2:** mudar a temperatura de 17 para 15 e de novo para 17 volta a mostrar os valores escritos.
  - **Regulação** com o exemplo português: escrever o parâmetro `1484,842` dá "Leitura a apontar" com `98,8440` em `#r-big`, e o campo Z fica escondido.
  - **Temperatura do dia:** depois de escrever 17 e recarregar, o campo temperatura propõe 17.

- [ ] **Step 2: Executar o e2e e confirmar que falha**

- [ ] **Step 3: Implementar**
  - **Campos novos no formulário:**
    - Cabo (select);
    - Temperatura local e correção (a etiqueta diz "Correção de temperatura (CC)" ou "(CG)", conforme o cabo; o valor lê e grava em `flechas-correcoes`);
    - linha "Temperatura de cálculo X °C";
    - "Flecha teórica": interruptor Direta / Pela tabela e os campos gerados por `linhasTabela`.
  - **Na regulação:** o mesmo bloco, mas para "Parâmetro"; o campo Z fica escondido e o resultado tem a etiqueta "Leitura a apontar".
  - **Método português:** escolher o cabo muda o `ponto` (`bracoDoCabo`) e aplica o tipo de apoio.
  - **Ao guardar** no histórico, o diálogo vem com o cabo preenchido.
  - A temperatura vazia ao abrir é preenchida com `temperaturaDoDia`, e cada alteração chama `lembrarTemperatura`.

- [ ] **Step 4: Executar `npm test && npm run e2e`. Esperado: tudo PASS.**
- [ ] **Step 5: Commit `"Cabo a cabo: cabo, temperatura local e correção, flecha pela tabela e regulação"`**

---

### Task 4: Estado do boletim (puro)

**Files:**
- Create: `src/boletim/state.js`, `tests/boletim.test.mjs`

**Interfaces:**
- Consome: `CABOS`, `grupoDoCabo`, `bracoDoCabo`, `tempCalculo`, `resolverTeorico` (Tarefa 1) e `computeCabo` (Tarefa 2).
- Produz:
  - `novoBoletim() -> B` com:
    - `{ id: null, vao: '', method: 'int', modo: 'ver', tLocal: '', corr: { CC: '', CG: '' }, a: '', t: '', dp: '', tipo: '', HS: '', perna: '', cota: '', F: '', tolA: '2,5', tolB: '1,5' }`
    - `teor: { CC: spec, CG: spec }` e `param: { CC: spec, CG: spec }`, em que `spec = { tipo: 'direta', direta: '', tabela: {} }`
    - `cabos: { [cabo]: { z1, z2, z, zf, cad, H, teor: spec|null, param: spec|null } }`, com todos os campos `''` e `teor`/`param` a `null`
  - `caboVazio(B, cabo) -> boolean`: sem nenhuma leitura entre `z1, z2, z, zf`.
  - `entradaDoCabo(B, cabo) -> S`: o estado de `computeCabo`.
    - `ft` e `preg` vêm de `String(resolverTeorico(spec do cabo ?? spec do grupo, Tc))`, ou `''` se for NaN.
    - `temp` vem de `B.tLocal`.
    - `H` é o do cabo; se o do cabo estiver vazio, é o da tabela de apoios pelo braço.
    - `HS` vem de `B.HS`.
  - `calcularBoletim(B) -> { [cabo]: R|null }`: `null` para cabos vazios.
  - `resumo(resultados) -> { total, conformes, naoConformes: string[] }`, só em verificação.

- [ ] **Step 1: Escrever os testes que falham**

```js
const vao910 = () => { const B = novoBoletim(); Object.assign(B, { method: 'pt', a: '417.36', F: '-350.56', cota: '5', HS: '0.689', perna: '0' });
  B.teor.CC = { tipo: 'direta', direta: '14.83', tabela: {} }; B.teor.CG = { tipo: 'direta', direta: '11.38', tabela: {} };
  for (const c of casos.folha_lbl.filter(c => c.id.startsWith('Vão 9-10'))) {
    const cabo = c.id.split(' ').pop(); Object.assign(B.cabos[cabo], { H: String(c.H), cad: String(c.cadeia), zf: String(c.zf), z: String(c.z) }); }
  return B; };
test('boletim dá os mesmos resultados que a folha LBL (vão 9-10)', () => {
  const R = calcularBoletim(vao910());
  for (const c of casos.folha_lbl.filter(c => c.id.startsWith('Vão 9-10'))) {
    const r = R[c.id.split(' ').pop()]; assert.ok(Math.abs(r.verdict.f - c.esperado.flecha) < 1e-9, c.id); assert.equal(r.verdict.ok, c.esperado.conforme); }
});
test('cabos vazios são ignorados', () => { const R = calcularBoletim(vao910()); assert.equal(R.CC2, null); assert.equal(R.CG2, null); });
test('resumo', () => assert.deepEqual(resumo(calcularBoletim(vao910())), { total: 4, conformes: 4, naoConformes: [] }));
test('valor próprio do cabo substitui o do grupo; sem valor próprio segue o grupo', () => {
  const B = vao910(); B.cabos.CC3.teor = { tipo: 'direta', direta: '14.00', tabela: {} };
  assert.equal(entradaDoCabo(B, 'CC3').ft, '14'); assert.equal(entradaDoCabo(B, 'CC1').ft, '14.83');
  B.teor.CC.direta = '15'; assert.equal(entradaDoCabo(B, 'CC1').ft, '15'); assert.equal(entradaDoCabo(B, 'CC3').ft, '14');
});
test('correção por grupo e interpolação pela tabela', () => {
  const B = vao910(); B.tLocal = '17'; B.corr = { CC: '10', CG: '5' };
  B.teor.CC = { tipo: 'tabela', direta: '', tabela: { '5': '14', '10': '15' } };
  B.teor.CG = { tipo: 'tabela', direta: '', tabela: { '10': '11', '15': '12' } };
  assert.equal(Number(entradaDoCabo(B, 'CC1').ft), 14.4); assert.equal(Number(entradaDoCabo(B, 'CG1').ft), 11.4);
});
test('H vazio no cabo vem da tabela de apoios pelo braço', () => {
  const B = novoBoletim(); B.method = 'pt'; B.tipo = 'AWA1';
  assert.equal(entradaDoCabo(B, 'CC1').H, '31'); assert.equal(entradaDoCabo(B, 'CC3').H, '25'); assert.equal(entradaDoCabo(B, 'CG1').H, '35');
});
```

Os valores dos casos usam ponto decimal, que o `parseNum` aceita. O AWA1 na tabela é Ht 35, BrSup 31, BrMed 25, Hu 19.

- [ ] **Step 2: Executar `npm test` e confirmar que falha**
- [ ] **Step 3: Implementar `src/boletim/state.js`. A tabela de apoios vem de `POSTES_ROWS`, e prevalece a última ocorrência de cada tipo.**
- [ ] **Step 4: Executar `npm test`. Esperado: PASS.**
- [ ] **Step 5: Commit `"Boletim: estado, mapeamento por cabo e resumo"`**

---

### Task 5: Boletim na interface, para telemóvel e tablet

**Files:**
- Create: `src/boletim/ui.js`, `e2e/boletim.spec.mjs`
- Modify: `index.html` (secção `#boletim`), `src/main.js`, `src/styles.css`

**Interfaces:**
- Consome: Tarefa 4; a barra de vista e modo da Tarefa 3; `lerCorrecoes`/`guardarCorrecoes` e `temperaturaDoDia`.
- Produz: `mountBoletim(root, { onChange }) -> { getState(): B, setState(B): void, resultados(): {cabo: R|null} }`. O rascunho é guardado em `flechas-boletim-v1` a cada alteração.

- [ ] **Step 1: Escrever o e2e `e2e/boletim.spec.mjs` (falha)**

Os testes correm com a sessão `signedIn`, em 3 projetos de viewport. Num `describe` por viewport, preencher o vão 9-10 da LBL no método português (dados do vão, depois CC1, CC3, CC5 e CG1 com H, cadeia, Zf e Z; flecha CC 14,83 e CG 11,38) e verificar:
- **Tablet horizontal:** `#boletim table` está visível e tem as colunas CC1…CG2; a linha "Flecha medida" mostra `14,69` em CC1 e `11,24` em CG1; o resumo diz "4 de 4 conformes".
- **Telemóvel:** não há tabela; há separadores `[role=tab]` CC1…CG2; no separador CC1 aparece `14,69`; o resumo diz "4 de 4 conformes".
- **Tablet vertical:** a tabela aparece com deslocamento horizontal e a coluna das etiquetas tem `position: sticky`.
- **Rodar e recarregar:** o vão é preenchido a 1280 × 800, passa a 800 × 1280 com `page.setViewportSize` e depois a página é recarregada. Os valores e o resumo mantêm-se (Review Focus 4).
- **Regulação no boletim:** com o parâmetro CC direto `1484,842`, a linha "Leitura a apontar" em CC1 mostra `98,8440`.
- **"Novo boletim"** com leituras pede confirmação e depois limpa tudo.

- [ ] **Step 2: Executar o e2e e confirmar que falha**

- [ ] **Step 3: Implementar**
  - **Ligar a vista:** `#vista-boletim` mostra `#boletim` e esconde `#calc`. A vista escolhida fica guardada em localStorage.
  - **Dados do vão em cima:**
    - vão (texto), método, temperatura local, correção CC e CG, com "Temperatura de cálculo CC x °C · CG y °C";
    - geometria comum do método;
    - teórica (ou parâmetro) do grupo CC e do grupo CG, cada uma Direta ou Pela tabela.
  - **Tablet (≥ 760 px de largura):**
    - tabela com cabeçalho agrupado (Braço superior / médio / inferior / Cabo de guarda) e uma coluna por cabo;
    - linhas de entrada por método e modo;
    - uma linha "Valor próprio" por cabo, com um botão que abre os campos do valor próprio (marcado com "●" quando existe);
    - linhas de resultado: na verificação, "Flecha medida", "Desvio" e "Resultado"; na regulação, "Leitura a apontar", "Leituras conformes" e "Flecha";
    - a coluna das etiquetas fica `position: sticky; left: 0`.
  - **Telemóvel (< 760 px):** separadores por cabo, com o mesmo conteúdo por cabo empilhado, e um cartão de resumo no fim.
  - **Toque:** alvos de pelo menos 44 px e `inputmode="decimal"` nos campos numéricos.

- [ ] **Step 4: Executar `npm test && npm run e2e`. Esperado: tudo PASS.**
- [ ] **Step 5: Commit `"Boletim do vão: tabela no tablet, separadores no telemóvel, regulação"`**

---

### Task 6: Histórico com boletins

**Files:**
- Modify: `src/history/export.js`, `src/history/ui.js`, `tests/history.test.mjs`, `e2e/history.spec.mjs`

**Interfaces:**
- Consome: `mountBoletim` (Tarefa 5) e os campos novos de `lastResult` (Tarefa 3).
- Produz:
  - **Registo boletim:** `{ id, kind: 'boletim', savedAt, vao, method, modo, boletim: B, resultados: { [cabo]: { flecha, desvio, conforme, p, z, zMin, zMax, ft, tc } | null } }`.
  - **Registo cabo:** passa a ter `kind: 'cabo'`, `modo`, `tLocal`, `tc` e, se for regulação, `result.z` e `result.p`. Os registos sem `kind` são lidos como `'cabo'`.
  - **`toCSV`:** novo cabeçalho `data;vao;cabo;modo;metodo;temp_local_c;temp_calculo_c;vao_m;flecha_teorica_m;flecha_medida_m;desvio_pct;resultado;parametro_m;leitura_alvo_grad`, com uma linha por cabo (cabo a cabo: 1 linha; boletim: uma linha por cabo não vazio). `modo` é `Verificação` ou `Regulação`.
  - **`parseImport`:** aceita `kind: 'boletim'` com `boletim` como objeto.

- [ ] **Step 1: Escrever os testes que falham**
  - Em `tests/history.test.mjs`:
    - o teste "CSV para Excel PT" muda para o novo cabeçalho;
    - "boletim exporta uma linha por cabo" (2 cabos → 2 linhas, com `9-10;CC1;Verificação;Português;`);
    - "regulação no CSV" (parametro_m e leitura_alvo_grad preenchidos e flecha medida vazia);
    - "registo antigo sem kind continua válido e exporta" (Review Focus 5);
    - "importa boletim".
  - Em `e2e/history.spec.mjs`:
    - "guardar boletim e reabrir" (no tablet horizontal, guarda o vão 9-10, depois "Novo boletim", abre o histórico, "Abrir" volta à vista boletim com os 4 resultados);
    - "guardar de novo um boletim reaberto atualiza o mesmo registo" (a lista continua com 1 linha).

- [ ] **Step 2: Executar `npm test && npm run e2e` e confirmar que os testes novos falham**

- [ ] **Step 3: Implementar**
  - **Na vista boletim:** "Guardar medição" fica ativo quando há pelo menos 1 cabo com resultado. O diálogo pede só o vão, que já vem de `B.vao`.
  - **Guardar:** usa `B.id` se existir; senão cria um id e grava-o no rascunho.
  - **Na lista:** um boletim aparece como `9-10 · Boletim · 4/4 conformes · dd/mm hh:mm`, ou `· Regulação` no modo de regulação.
  - **"Abrir"** muda para a vista certa e repõe o estado.

- [ ] **Step 4: Executar `npm test && npm run e2e`. Esperado: tudo PASS.**
- [ ] **Step 5: Commit `"Histórico: boletins do vão, regulação e CSV com modo e temperaturas"`**

---

### Task 7: Documentação e versão

**Files:**
- Modify: `package.json` (`version` 1.1.0), `CLAUDE.md`, `README.md`, `docs/configuracao.md` (secção "Usar a app": vistas, modos, temperatura e correção)

- [ ] **Step 1: Atualizar os textos**
  - No `CLAUDE.md`:
    - "Questões em aberto" perde o boletim por vão e a "Correção Temperatura", que passam a estar decididos;
    - acrescentar a regra `Tc = Tlocal − correção` e a interpolação ao "Modelo de cálculo".
- [ ] **Step 2: Executar `npm test && npm run e2e && npm run build`. Esperado: tudo PASS e build sem erros.**
- [ ] **Step 3: Commit `"Versão 1.1.0: documentação do boletim, regulação e temperatura"`**
