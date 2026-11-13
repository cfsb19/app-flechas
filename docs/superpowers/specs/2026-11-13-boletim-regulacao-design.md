# Boletim do vão, regulação e flecha teórica pela temperatura

Data: 2026-11-13 · Estado: proposta para aprovação (perguntas do revisor respondidas) · Parte da base: ramo `claude/pwa-apk` (PR #1)

## Intenção e porquê

No terreno, o Batista regista os 8 cabos de um vão de cada vez, como na app existente da foto (`referencia/app-existente-metodo-internacional.jpeg`). Hoje a app só faz um cabo de cada vez. Também não ajuda com a flecha teórica: as folhas de regulação dão as flechas, e os parâmetros, de 5 em 5 °C, e é preciso corrigir a temperatura por causa da fluência e interpolar à mão. Para além de **verificar** flechas, quer usar a app para **regular** o cabo: indica o parâmetro e a app diz a leitura a que deve apontar o teodolito. Usa a app num smartphone e num tablet Samsung Galaxy Tab S7 FE (Android, APK).

## Objetivos

1. **Duas vistas:**
   - **Cabo a cabo:** a calculadora atual.
   - **Boletim do vão:** os 8 cabos de uma vez (CC1–CC6, CG1, CG2), como na foto.
2. **Dois modos nas duas vistas:**
   - **Verificação:** o que já existe. A leitura Z dá a flecha medida, que é comparada com a teórica e dá Conforme/Não conforme.
   - **Regulação:** o parâmetro dá a leitura Z a que se aponta o teodolito, a flecha correspondente e o intervalo de leituras conformes.
3. **Temperatura:**
   - A **temperatura local** é escrita à mão. A app propõe o último valor usado **nesse dia**.
   - Há uma **correção de temperatura** (fluência) **para os CC e outra para os CG**. Cada uma fica guardada da última vez que foi usada.
   - **Temperatura de cálculo** = temperatura local − correção do grupo do cabo.
4. **Flecha teórica direta ou pela tabela,** e o mesmo para o parâmetro no modo de regulação:
   - **Direta:** um valor.
   - **Pela tabela:**
     - se a temperatura de cálculo é múltiplo de 5, a app pede **um** valor, "Flecha a T °C";
     - se não é, pede o valor a ⌊T/5⌋·5 e a ⌈T/5⌉·5 e **interpola linearmente**.
     - As temperaturas pedidas aparecem nas etiquetas dos campos, por exemplo "Flecha a 5 °C".
5. **Ecrã otimizado para telemóvel e tablet:**
   - **Telemóvel:** no boletim, os dados do vão ficam em cima, há separadores por cabo e um resumo no fim.
   - **Tablet na horizontal (Tab S7 FE ≈ 1280 × 800 CSS px):** tabela como na foto, com grupos por braço, os cabos em colunas e os resultados por baixo das entradas.
   - **Tablet na vertical (≈ 800 × 1280):** a mesma tabela com deslocamento horizontal e a coluna das etiquetas fixa.
   - **Toque:** alvos com pelo menos 44 px e teclado numérico decimal nos campos.
6. **Histórico:**
   - O boletim é guardado como **um registo do vão** com os 8 cabos e pode ser reaberto inteiro.
   - No CSV sai uma linha por cabo.
   - Os registos cabo a cabo continuam a funcionar como até aqui, e os antigos continuam a abrir.

## Não objetivos

- Ler a temperatura automaticamente (sensor ou meteorologia). Foi decidido: escrita à mão.
- Relatório em PDF. Fica para depois.
- Mudar o cálculo do núcleo (`core/flechas-core.mjs`) ou as tolerâncias.

## Anti-objetivos

- Resultados diferentes para o mesmo cabo entre a vista cabo a cabo e o boletim.
- Qualquer pedido de rede novo, incluindo meteorologia ou localização.
- Perder dados escritos num boletim a meio, por exemplo ao mudar de separador, rodar o tablet ou fechar e reabrir a app.
- Pedir duas flechas quando a temperatura de cálculo é múltiplo de 5.

## Regras de cálculo novas

- `Tc = Tlocal − correção(grupo)`, com o grupo CC para CC1–CC6 e CG para CG1 e CG2.
- **Interpolação** com `T₀ = 5·⌊Tc/5⌋` e `T₁ = T₀ + 5`:
  - Se `Tc` é múltiplo de 5 (tolerância de 1e-9), o valor é `v(Tc)`.
  - Se não, o valor é `v(T₀) + (Tc − T₀)/5 · (v(T₁) − v(T₀))`.
  - Funciona com temperaturas negativas: −3 °C usa −5 e 0.
- **Regulação:**
  - Com o parâmetro `p` e a geometria do cabo (Z₁/Z₂ no método internacional, H/HS/cadeia/cota/F/Zf no português), a leitura alvo é a de `solveTangent(a, d, p, t, h)` e a flecha é a do método (`flechaInternacional` ou `flechaPortugues`).
  - O intervalo de leituras conformes calcula-se como hoje (`limitesFlecha` e leitura nos limites), tomando a flecha de `p` como teórica.
  - Se a geometria não permitir uma visada tangente dentro do vão, a app diz isso e não mostra nenhum número.
- **Correspondência cabo → braço no método português**, para obter H pela tabela de apoios:
  - CC1/CC2 → Br.Sup
  - CC3/CC4 → Br.Med
  - CC5/CC6 → Hu
  - CG1/CG2 → Ht

## Dados no boletim

**Comuns ao vão:**
- Método, modo, identificação do vão (por exemplo "9-10"), temperatura local, correção CC e correção CG.
- Flecha teórica, ou parâmetro, separada para CC e CG, cada uma direta ou pela tabela.
- **Método internacional:** vão `a` e distância de visada `t`.
- **Método português:** vão `a`, desnível do perfil (opcional), apoio de estação (tipo), perna, cota e distância F.
- Tolerâncias, como hoje.

**De cada cabo:**
- **Método internacional:** Z₁ e Z₂. Z também, no modo de verificação.
- **Método português:** cadeia e Zf. Z também, no modo de verificação.
  - O H vem da tabela de apoios pelo braço do cabo e pode ser corrigido à mão quando o tipo não tem valor nesse braço.
  - A cadeia é pré-preenchida com a do cabo anterior do mesmo grupo.
- Um cabo com as colunas vazias é ignorado. Há linhas com menos cabos, por exemplo um só cabo de guarda.

**Resultados por cabo:**
- **Verificação:** flecha medida, desvio e Conforme/Não conforme, mais os avisos de hoje (sensibilidade, tangência perto do apoio).
- **Regulação:** leitura Z alvo, intervalo de leituras conformes e flecha correspondente.
- **Resumo do vão:** "6 de 8 conformes", com a lista dos não conformes.

**Na vista cabo a cabo:**
- Passa a haver um seletor de **cabo** (CC1…CG2). Escolhe a correção (CC ou CG) e, no método português, o braço.
- Ao guardar, o cabo já vem preenchido.

## Abordagens consideradas

| Abordagem | Decisão |
|---|---|
| **Crescer a partir da app atual:** extrair o cálculo de um cabo (`compute`) de `src/calc/app.js` para um módulo puro e testado, usado pelas duas vistas | **Escolhida.** É a única forma sensata: mantém o cálculo validado, o login e o histórico, e garante resultados iguais nas duas vistas |
| Fazer o boletim como uma app à parte | Rejeitada: duplicaria o cálculo e o histórico |
| Boletim com 8 instâncias da calculadora atual | Rejeitada: a calculadora está presa ao DOM por ids e o ecrã ficaria 8 vezes maior |

## Respostas já dadas pelo Batista

- **Correção de temperatura:**
  - É a correção de **fluência**, confirmada pelo Batista: subtrai-se à temperatura local (`Tc = Tlocal − correção`).
  - É diferente para CC e para CG.
  - Aplica-se nos dois modos.
  - Quando `Tc` é múltiplo de 5, a app pede um só valor da tabela.
- **Histórico e CSV:** guardam a temperatura local, as correções e a temperatura de cálculo de cada grupo.
- **Desnível do perfil (método português):** é **um só valor para o vão**, aplicado a todos os cabos.
- **Flecha teórica ou parâmetro:** o CG1 e o CG2, e os condutores entre si, **podem ter valores diferentes**.
  - O valor do grupo (CC ou CG), direto ou pela tabela, pré-preenche cada cabo.
  - Cada cabo pode ter o seu próprio valor, também direto ou pela tabela, e esse valor substitui o do grupo.
  - O cabo com valor próprio fica marcado.

## Decisões tomadas por mim (podem ser corrigidas)

- **As duas vistas têm as funcionalidades novas:** temperatura local, correção, flecha direta ou pela tabela e modo de regulação.
- **Cada vista tem o seu rascunho** guardado no aparelho. Os rascunhos não se misturam.
- **O que se interpola em cada modo:**
  - na **verificação**, a flecha;
  - na **regulação**, o parâmetro (interpolação linear em p).
  - Numa regulação a partir da flecha, a "leitura esperada" do modo de verificação já dá esse resultado.
- **Rascunho e registos do boletim:**
  - Há **um** rascunho de boletim. "Novo boletim" limpa-o, depois de pedir confirmação se tiver leituras.
  - "Guardar" num boletim reaberto do histórico **atualiza** esse registo (mesmo `id`). Um boletim novo cria um registo novo.
  - Um boletim parcial pode ser guardado se tiver pelo menos um cabo com resultado.
  - Um cabo conta como vazio quando não tem leituras (Z₁/Z₂/Z ou Zf/Z). A cadeia pré-preenchida não conta.
- **A geometria de cada cabo é obrigatória na regulação,** como na verificação: Z₁/Z₂ no método internacional, Zf ou o desnível do perfil no português.

- O seletor Verificação/Regulação e o seletor Cabo a cabo/Boletim ficam no topo, visíveis nas duas vistas.
- O boletim a meio é guardado automaticamente no aparelho (como o formulário de hoje) e reposto ao reabrir.
- As medições no modo de regulação também podem ir para o histórico (com uma coluna "modo" no CSV).
- A temperatura proposta é a última escrita no mesmo dia civil. Num dia novo o campo começa vazio.
- O registo do boletim no histórico tem `kind: 'boletim'`. Os registos antigos, sem `kind`, são tratados como cabo a cabo.

## Fica ao critério do builder

- O nome e a divisão dos módulos novos, desde que o cálculo de um cabo fique numa função pura testada.
- A disposição exata dos resultados no telemóvel.
- O formato interno do registo `boletim`, desde que a importação e a exportação continuem compatíveis.

## Validação

- Os casos de `tests/casos-validacao.json` dão o mesmo resultado na vista cabo a cabo e no boletim. O vão 9-10 da folha LBL tem CC1, CC3, CC5 e CG1, e o vão 12-13 tem CC1, CC3, CC5, CG1 e CG2.
- **Ida e volta da regulação:** o parâmetro tirado de uma medição (`calcularCabo`) dá, em regulação, a mesma leitura Z.
- **Interpolação:** múltiplo de 5 (1 campo), valor intermédio (2 campos), temperaturas negativas.
- **e2e:**
  - boletim no tablet horizontal (1280 × 800), na vertical (800 × 1280) e no telemóvel (390 × 844);
  - reabrir um boletim a partir do histórico;
  - os dados do boletim não se perdem ao recarregar.
