# App de verificação de flechas por visada (linhas MAT, REN)

Responde sempre em português europeu. O utilizador é o Batista, fiscal de obra na REN (equipa OGOP-IN), em obras de linhas de muito alta tensão. Usa a app no terreno para verificar a regulação de condutores (CC) e cabos de guarda (CG) com teodolito.

## Objetivo

Uma app de campo que, a partir das leituras do teodolito, calcula a flecha real de cada cabo, compara com a flecha teórica da tabela de regulação e diz se está **Conforme / Não conforme**. Dois métodos: **internacional** e **português**.

## Restrições (não negociáveis)

- **Offline e local.** Nada de servidor, nada de chamadas de rede, os dados nunca saem do dispositivo. Entregável preferido: um único ficheiro HTML autossuficiente (JS e CSS embutidos, sem CDN, sem fontes externas).
- **Sem custos e não público.** Nada de alojamento pago; se houver alojamento, tem de ter controlo de acesso.
- **Dispositivos:** iPhone pessoal (abre HTML local com o Documents by Readdle) e PC da empresa bloqueado (Edge/Chrome no Windows, sem poder instalar Node/Python). Ferramentas de desenvolvimento (Node para testes) só correm fora desse PC.
- Em iPhone, `file://` limita o localStorage; uma PWA resolveria a persistência mas exige HTTPS (candidatos: intranet ou Azure Static Web Apps; SharePoint sanitiza JS e não serve).

## Estado atual

- `app/calculadora-flechas.html`: protótipo funcional e validado pelo utilizador. Dois métodos, seletor de apoio com pesquisa, perfil do vão em SVG, barra de tolerância, leitura esperada, botões "Próximo cabo" / "Nova medição". Atenção: carrega Google Fonts (tem fallback, mas viola a regra offline; embutir ou retirar).
- `core/flechas-core.mjs`: o mesmo cálculo isolado da interface, com testes (`node --test` na raiz, 17 testes a passar).
- `calculadora/flechas_nspire.txt`: versão em TI-Basic para a TI-Nspire CX CAS (geração anterior, sem Python), com a tabela de apoios embutida. Validada por tradução automática para Python; ainda não testada na calculadora.
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

## Armadilhas já resolvidas

- O documento Word tem um passo errado ("X* ≈ 4506 m"); o 79,2552 grad é a leitura zenital, não a elevação. A diferença de sinal de t entre os dois métodos não é erro: é a convenção F negativo da folha.
- Tipos de apoio repetidos na tabela (CR4, DIR1, QRS10): prevalece a última linha, como o PROCV da folha. Tipos sem valor num braço (ex.: CR4 sem Br.Sup) → pedir H à mão.
- Desnível do perfil: a folha usa o desnível medido no parâmetro e o do perfil só na flecha; a app usa o do perfil nos dois (diferença de milímetros). Decisão em aberto.
- Sensibilidade: com tangência perto de um apoio, 0,01 grad de erro na leitura pode valer ~20 cm de flecha, o que é da ordem da tolerância. A app mostra este valor e avisa quando a tangência fica fora de 10–90 % do vão.
- Decimais com vírgula na entrada (o utilizador escreve `425,48`).

## Questões em aberto e próximos passos

- A app existente da foto organiza o trabalho em passos (Terreno → Poste → Cabos → Resultados → Resumo) e regista os 8 cabos de um vão de uma vez (CC1–CC6, CG1, CG2). Avaliar o mesmo modelo: um boletim por vão em vez de um cabo de cada vez.
- Essa app tem "Correção Temperatura" e "Flecha Teórica Supra/Infra" (interpolação entre temperaturas da tabela?). O significado ainda não foi confirmado; perguntar ao utilizador antes de implementar.
- Guardar medições localmente (localStorage/IndexedDB como cache, exportação/importação JSON como arquivo durável) e exportar resultados (PDF/CSV gerados no browser).
- Decidir a distribuição: HTML local no Documents by Readdle vs PWA com alojamento com controlo de acesso.

## Forma de trabalhar com o utilizador

- Reporta sintomas observados com precisão; prefere iterações curtas testadas com dados reais.
- Validar sempre contra `tests/casos-validacao.json` (os casos da folha LBL são a referência) antes de dar uma alteração ao cálculo por concluída.
- Manter o núcleo de cálculo separado da interface e coberto por testes.
