# App Flechas: PWA (iPhone/PC) e APK (Android) com controlo de utilizadores

Data: 2026-11-13 · Estado: proposta para aprovação

## Intenção e porquê

Hoje a calculadora de flechas é um ficheiro HTML local, aberto no iPhone pelo Documents by Readdle. Funciona e o cálculo está validado. O que falta é ser **mais prática de usar** e permitir **controlar quem a usa**. O Batista quer partilhá-la com um pequeno grupo de colegas, uns da REN e outros externos. Quando alguém deixa de trabalhar com a equipa, a app dessa pessoa tem de **deixar de funcionar**.

## Utilizadores

- O Batista, que é também o administrador, e alguns colegas: fiscais da REN e externos.
- Dispositivos: iPhone, Android e, como extra, o PC da empresa (Edge/Chrome, sem poder instalar nada).
- Uso no terreno, muitas vezes **sem rede**.

## Objetivos

1. **iPhone:** a app instala-se a partir de um link, como PWA adicionada ao ecrã inicial. Tem ícone próprio, abre em ecrã inteiro e funciona offline.
2. **Android:** um APK instalado diretamente, sem Play Store, construído a partir do **mesmo código**. Também deve funcionar a PWA no Android.
3. **Login por email.** Só entram as pessoas criadas pelo administrador. Não há registo livre.
4. **Corte de acesso.** O administrador desativa uma conta e a app dessa pessoa bloqueia na próxima vez que ligar à internet ou, no máximo, quando acabar o prazo offline. O prazo é de **7 dias** sem verificação. Foi proposto na conversa e não houve objeção.
5. **Cálculo inalterado.** Reutiliza-se `core/flechas-core.mjs` tal como está. Os 17 testes têm de continuar a passar.
6. **A interface do protótipo mantém-se:** os dois métodos, o seletor de apoio com pesquisa, o perfil do vão em SVG, a barra de tolerância, a leitura esperada e os botões "Próximo cabo" e "Nova medição".
7. **Medições guardadas no aparelho.** Não se perdem ao fechar a app. Há um histórico simples e exportação para ficheiro.

## Não objetivos (para já)

- App nas lojas (App Store/Play Store) ou app nativa iOS, que custa 99 USD/ano.
- Medições centralizadas, sincronização entre aparelhos ou ver as medições dos colegas.
- Página de administração própria. A gestão de utilizadores faz-se na consola do Firebase.
- Boletim por vão com os 8 cabos de uma vez (Terreno → Poste → Cabos → Resultados → Resumo), "Correção Temperatura", "Flecha Teórica Supra/Infra" e relatórios em PDF. Ficam para uma versão seguinte. O significado das duas últimas ainda está por confirmar.

## Anti-objetivos (falha mesmo que "funcione")

- Dados de medições a sair do aparelho.
- Qualquer serviço com custo, ou que exija cartão de crédito.
- A app precisar de rede para calcular no terreno.
- Alterar o resultado do cálculo sem validação contra `tests/casos-validacao.json`.
- Um utilizador desativado conseguir continuar a usar a app indefinidamente.

## Restrições

- Custo zero: planos gratuitos do Firebase (Spark) e builds no GitHub Actions dentro dos minutos gratuitos.
- Offline em primeiro lugar. Tudo o que a app precisa (código, tipos de letra, tabela de apoios) fica em cache no aparelho. Nada vem de CDN ou do Google Fonts.
- No servidor só existe o email de cada utilizador, no Firebase Authentication. Não existe nenhuma base de dados com dados de obra.
- Interface e mensagens em português europeu. Os números aceitam vírgula decimal.

## Abordagens consideradas

| Abordagem | Prós | Contras | Decisão |
|---|---|---|---|
| **PWA + APK com Capacitor (mesmo código web)** | Custo zero em iPhone e Android; reaproveita o protótipo e o núcleo validado; pode vir a ser app nativa sem reescrever | No iPhone, instalar no ecrã inicial é um passo manual; o APK precisa de "fontes desconhecidas" | **Escolhida** |
| App nativa com Capacitor, iOS + Android nas lojas | Instalação mais familiar | 99 USD/ano da Apple; viola "sem custos" | Rejeitada por custo |
| Reescrita em React Native/Expo | Aspeto mais nativo | Refazer a interface toda; mesmo custo Apple | Rejeitada |
| App iOS nativa instalada pelo Xcode com Apple ID gratuito | Gratuita | Expira em 7 dias; exige o iPhone ligado a um Mac | Rejeitada |

Escolha do Batista: "avança com a PWA e APK".

## Arquitetura (decidida)

- **Uma base de código web** neste repositório, que gera duas saídas:
  - a PWA, alojada no **Firebase Hosting** (domínio `*.web.app`, HTTPS gratuito);
  - o APK Android, com o **Capacitor** a empacotar os mesmos ficheiros, construído no **GitHub Actions** e assinado com uma chave guardada nos segredos do repositório.
- **Autenticação:** Firebase Authentication com email e palavra-passe, e o registo público desativado.
  - O administrador cria a conta na consola. A pessoa recebe o email de "definir palavra-passe" e escolhe a sua.
  - Para cortar o acesso, o administrador **desativa** ou apaga a conta na consola.
- **Verificação de acesso:**
  - Sempre que há rede (ao abrir a app e periodicamente), a app força a renovação do token. Se der certo, guarda a data da última verificação.
  - Se a conta estiver desativada ou apagada, a app bloqueia logo.
  - Sem rede, a app funciona enquanto a última verificação tiver menos de 7 dias. Passado esse prazo, mostra "Liga-te à internet para continuar".
  - Mudar o relógio do telemóvel pode contornar o prazo. Num grupo pequeno e de confiança, o risco é aceitável.
- **Armazenamento local:** IndexedDB para o histórico de medições, que continua no aparelho mesmo que a conta seja desativada. A exportação é em JSON, que serve de cópia de segurança e pode ser importado, e em CSV para Excel.
- **Atualizações:** a PWA atualiza-se pelo service worker. No APK, a app consulta um `version.json` no alojamento e, se houver versão nova, mostra um aviso com o link de download.

## Calls do builder já tomadas (podem ser corrigidas)

- O APK fica disponível para download num link do próprio alojamento. O ficheiro é acessível a quem tiver o link, mas não serve de nada sem conta.
- Um utilizador desativado vê a app bloqueada, mas os dados não são apagados. Se for reativado, volta a vê-los.
- Os tipos de letra Barlow passam a ir com a app, em vez de virem do Google Fonts.
- Os testes continuam a correr com `node --test`, e o GitHub Actions corre-os antes de cada build.
- O `CLAUDE.md` passa a refletir a nova decisão. A regra "nada de servidor, nada de chamadas de rede" muda para: só o login fala com a rede, e as medições nunca saem do aparelho.

## Fica ao critério do builder

- Ferramenta de build (por exemplo Vite) e a forma de gerar o service worker.
- A divisão do protótipo em módulos, desde que a interface e o comportamento se mantenham.
- O formato exato de cada registo no histórico e a forma da lista.
- Os ícones e o ecrã de arranque.
- Os passos de configuração do Firebase. O projeto tem de ser criado pelo Batista na conta Google dele, por isso o builder escreve as instruções passo a passo.

## Questões em aberto

- Os ficheiros da app (o código e a tabela de apoios) ficam acessíveis a quem tiver o link, mesmo sem conta. Só a utilização é que exige login. Ver a pergunta ao Batista.
