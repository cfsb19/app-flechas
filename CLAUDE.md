# App de verificação de flechas por visada (linhas MAT, REN)

Responde sempre em português europeu. O utilizador é o Batista, fiscal de obra na REN (equipa OGOP-IN), em obras de linhas de muito alta tensão. Usa a app no terreno para verificar a regulação de condutores (CC) e cabos de guarda (CG) com teodolito.

## Objetivo

Uma app de campo que, a partir das leituras do teodolito, calcula a flecha real de cada cabo, compara com a flecha teórica da tabela de regulação e diz se está **Conforme / Não conforme**. Dois métodos: **internacional** e **português**.

## Restrições (não negociáveis)

- **Medições só no aparelho.** Só o login (Firebase Auth) usa a rede; as medições nunca saem do aparelho; a app funciona offline até 7 dias sem verificação. Nada de CDN nem de fontes externas.
- **Sem custos.** Firebase plano Spark (Auth + Hosting) e GitHub Actions dentro da quota gratuita. Nada de Apple Developer (99 USD/ano) nem Play Store.
- **Controlo de acesso:** só entram contas criadas pelo administrador (Batista) na consola Firebase; registo público desligado. Conta desativada → a app bloqueia na próxima ligação ou ao fim do prazo de 7 dias. Os ficheiros da app são acessíveis pelo link (decisão do Batista: o controlo cobre o uso, não os ficheiros).
- **Dispositivos:** iPhone (PWA pelo Safari), Android (APK por instalação direta) e PC da empresa bloqueado (Edge/Chrome, sem poder instalar Node/Python). Ferramentas de desenvolvimento só correm fora desse PC.

## Estado atual

- **App (PWA + APK):** `index.html` + `src/`, construída com Vite. Vistas "Cabo a cabo" (`src/calc/app.js`) e "Boletim do vão" (`src/boletim/`), modos Verificação e Regulação; o cálculo de um cabo é `computeCabo` em `src/calc/compute.js` (usa o núcleo, sem cópias do cálculo), temperatura e interpolação em `src/calc/temperatura.js`, login e prazo offline em `src/access/`, histórico local (IndexedDB, exportação JSON/CSV) em `src/history/`, APK com Capacitor em `android/`. Design: `docs/superpowers/specs/2026-11-13-app-flechas-pwa-apk-design.md`. Configuração e instalação: `docs/configuracao.md`.
- `core/flechas-core.mjs`: o cálculo isolado da interface, com testes. `npm test` (unitários) e `npm run e2e` (Playwright, com login falso `VITE_AUTH=fake`).
- **Cópia num único ficheiro HTML, sem login** (decisão do Batista, só para uso dele): `npm run build:html` gera `dist-local/flechas.html` (modo Vite `ficheiro`, `VITE_AUTH=none`, sem service worker; `scripts/inline-html.mjs` embute JS, CSS e fontes). O CI guarda-o como artefacto `flechas-html`; **nunca** é publicado no alojamento.
- `app/calculadora-flechas.html`: protótipo antigo de ficheiro único (Documents by Readdle). Já não é atualizado; substituído pela cópia acima.
- `calculadora/flechas_nspire.txt`: versão em TI-Basic para a TI-Nspire CX CAS, com a tabela de apoios embutida. Validada por tradução automática para Python; ainda não testada na calculadora.
- `data/postes.json`: tabela de 485 tipos de apoio extraída da folha LBL.
- `referencia/`: documento Word original (com erros, ver abaixo), folha Excel LBL do método português e foto de uma app existente.

## Modelo de cálculo

Comum aos dois métodos:
- Catenária com origem no ponto mais baixo: `y = p·(cosh(x/p) − 1)`.
- Apoio 1 (lado do teodolito): `AU = 2p·sinh(a/2p)`, `k = d/AU`, `XA = −a/2 + p·asinh(k)`, `YA = p·(cosh(XA/p) − 1)`.
- Teodolito em `(XA − t, YA − h)`. Visada tangente no ponto X quando `p(cosh(X/p) − 1) − sinh(X/p)(X − XA + t) − YA + h = 0`.
- Leitura zenital da visada: `Z = 100 − arctan(sinh(X/p))` em grados.
- Na verificação, X = p·asinh(tan(100 − Z)) e procura-se p. **Há muitas vezes duas raízes**; vale a que tem tangência dentro do vão (0 ≤ X − XA ≤ a), e se houver duas dentro, a mais perto do meio. O varrimento em log + bisseção é robusto; Newton a partir de 1500 (como a folha) pode convergir para a raiz errada.

Método internacional (t positivo para fora do vão):
- Entradas: vão a, distância de visada t, Z1 e Z2 (leituras zenitais aos pontos de fixação nos apoios 1 e 2), Z ao seio do cabo, temperatura, flecha teórica.
- `Desn1 = t·tan(100 − Z1)`, `Desn2 = (a + t)·tan(100 − Z2)`, `d = Desn2 − Desn1`, `h = Desn1`.
- Flecha: `a·√(a² + d²)/(8p)·(1 + (a² + d²)/(48p²))`.
- Desvio: `(medida − teórica)/teórica`.

Método português (folha LBL; F negativo para fora do vão, `t = −F`):
- Entradas: vão a, desnível do perfil (opcional), apoio de estação (tipo → H por braço e HS pela tabela), perna, cadeia, cota, distância de visada F, Zf (ângulo de fixação no apoio oposto), Z ao seio, temperatura, flecha teórica.
- `S = H − HS − cadeia − cota + perna` (fixação na estação acima do teodolito), `h = S`.
- `d = (a − F)·tan(100 − Zf) − S`, ou o desnível do perfil se indicado.
- Flecha exata a meio vão: `p·(cosh(a/2p) − 1)·√(1 + (d/AU)²)`.
- Desvio: `1 − teórica/medida` (é a coluna com formatação condicional na folha).
- Mapeamento dos cabos na folha: CC1/CC2 → Br.Sup, CC3/CC4 → Br.Med, CC5/CC6 → Hu, CG → Ht.

Tolerâncias: cabo mais alto (flecha menor) até −2,5 %; cabo mais baixo (flecha maior) até +1,5 %.

Temperatura e tabela de regulação (confirmado pelo Batista):
- Temperatura local escrita à mão; a app propõe a última escrita no mesmo dia.
- Correção de temperatura = correção de **fluência**, diferente para CC e CG: `Tc = Tlocal − correção`.
- Flecha teórica (verificação) ou parâmetro (regulação): direta ou pela tabela. Se `Tc` é múltiplo de 5 pede-se só esse valor; senão pedem-se os de `5·⌊Tc/5⌋` e `+5` e interpola-se linearmente.
- Regulação: parâmetro p → leitura Z a apontar (visada tangente com p), intervalo de leituras conformes e flecha correspondente.
- Boletim do vão: 8 cabos (CC1–CC6, CG1, CG2). Comum ao vão: geometria, temperatura, correções, desnível do perfil (um só valor). Flecha/parâmetro por grupo (CC, CG) com valor próprio opcional por cabo.

## Armadilhas já resolvidas

- O documento Word tem um passo errado ("X* ≈ 4506 m"); o 79,2552 grad é a leitura zenital, não a elevação. A diferença de sinal de t entre os dois métodos não é erro: é a convenção F negativo da folha.
- Tipos de apoio repetidos na tabela (CR4, DIR1, QRS10): prevalece a última linha, como o PROCV da folha. Tipos sem valor num braço (ex.: CR4 sem Br.Sup) → pedir H à mão.
- Desnível do perfil: a folha usa o desnível medido no parâmetro e o do perfil só na flecha; a app usa o do perfil nos dois (diferença de milímetros). Decisão em aberto.
- Sensibilidade: com tangência perto de um apoio, 0,01 grad de erro na leitura pode valer ~20 cm de flecha, o que é da ordem da tolerância. A app mostra este valor e avisa quando a tangência fica fora de 10–90 % do vão.
- Decimais com vírgula na entrada (o utilizador escreve `425,48`).

## Questões em aberto e próximos passos

- Relatório em PDF gerado no aparelho (o histórico já exporta JSON e CSV).

## Forma de trabalhar com o utilizador

- Reporta sintomas observados com precisão; prefere iterações curtas testadas com dados reais.
- Validar sempre contra `tests/casos-validacao.json` (os casos da folha LBL são a referência) antes de dar uma alteração ao cálculo por concluída.
- Manter o núcleo de cálculo separado da interface e coberto por testes.
