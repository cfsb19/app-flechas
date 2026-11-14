# Pedidos de acesso com aprovação na app, alerta por email e envio de medições ao administrador

Data: 2026-11-14 · Estado: aprovado na conversa pelo Batista ("dá para fazer assim…", administrador `carlosfbatista19@gmail.com`, opção 1 para as medições)

## Intenção

Hoje, para dar acesso a um colega, o Batista tem de ir à consola do Firebase criar a conta. Quer três coisas:
- que as pessoas **peçam acesso na própria app**;
- **aprovar ou recusar dentro da app**, sem passar pela consola;
- **receber um email de alerta** a cada pedido novo.

Quer também receber as medições dos colegas, mas **só quando eles as enviam** (opção 1): nada é centralizado.

## Comportamento

**Pedir acesso.** No login há a ligação "Pedir acesso". A pessoa preenche nome, email e palavra-passe (6 caracteres no mínimo) e carrega em **Enviar pedido**. A app:
1. cria a conta no Firebase Auth;
2. cria o pedido em `acessos/{uid}` com `estado: 'pendente'`;
3. envia o alerta por email;
4. mostra o ecrã **"À espera de aprovação"**.

**À espera de aprovação.**
- O ecrã mostra o texto "O teu pedido de acesso está à espera de aprovação do administrador." e os botões **Verificar outra vez** e **Sair**.
- A calculadora não fica acessível.

**Administrador.**
- É administrador a conta com o email `carlosfbatista19@gmail.com`. Este email existe **só nas regras do Firestore**, nunca no código da app.
- A app descobre se o utilizador é administrador tentando listar a coleção `acessos`: só o administrador consegue.
- O administrador fica sempre aprovado.
- Na barra da conta aparece **Administração**. Abre uma janela com três listas:
  - Pendentes: **Aprovar** e **Recusar**;
  - Aprovados: **Retirar acesso**;
  - Recusados ou retirados: **Aprovar**.
- Ao entrar, se houver pedidos pendentes, aparece uma faixa "N pedido(s) de acesso pendente(s)" com o botão **Ver**.

**Contas antigas** (criadas na consola, sem documento `acessos`): no primeiro login com rede, a app cria-lhes um pedido `pendente` e não envia alerta. O administrador aprova-as uma vez.

**Verificação e prazo offline.** O prazo de 7 dias e as regras de `lease.js` mantêm-se. A verificação online passa a consultar também `acessos/{uid}`, sempre no servidor (`getDocFromServer`):

| Estado | O que acontece |
|---|---|
| `aprovado` | grava o prazo (lease) |
| `pendente` | ecrã "À espera de aprovação", sem gravar prazo |
| `recusado` | termina a sessão, apaga o prazo e mostra o login com "O teu acesso à app foi recusado ou retirado. Fala com o administrador." |
| erro de rede | conta como "sem rede": aplica-se o prazo |

**Login.** Um login bem-sucedido só grava o prazo se o estado for `aprovado`.

**Alerta por email.**
- A app faz `POST` (`no-cors`, `text/plain`, com `{nome, email}`) para `VITE_ALERTA_URL`, um script Google Apps Script na conta Google do Batista. O script envia o email para `carlos.batista@ren.pt` com o MailApp.
- O script limita a 30 emails a cada 6 horas e corta os campos a 80/120 caracteres.
- Se o URL não estiver configurado ou o envio falhar, o pedido não falha.

**Enviar ao administrador.**
- Novo botão no histórico, **Enviar ao administrador**. Gera o JSON do histórico.
- No APK abre o menu Partilhar, com `saveFile`. Na web, usa a partilha de ficheiros do sistema se existir (`navigator.canShare({files})`).
- Se não houver nenhuma das duas, descarrega o ficheiro, abre `mailto:carlos.batista@ren.pt` com assunto e texto, e mostra "Anexa ao email o ficheiro … que acabou de ser descarregado."

## Firestore

- Coleção `acessos/{uid}`: `{ email, nome, estado, pedidoEm, decididoEm? }`.
- Regras em `firestore.rules`:
  - cada pessoa lê o seu documento (`get`);
  - cada pessoa cria o seu documento, só com `estado == 'pendente'`, o email do token, um nome de até 80 caracteres e só as chaves `email`, `nome`, `estado` e `pedidoEm`;
  - o administrador lista, lê, atualiza e apaga.
- As regras são publicadas pelo `release.yml` (`firebase deploy --only firestore:rules`), com a mesma conta de serviço. Essa conta precisa do papel extra **Administrador de regras do Firebase** (`roles/firebaserules.admin`).
- **Configuração no Firebase:**
  - Firestore criado pelo Batista na consola, em modo de produção, na região Europa;
  - registo público **ligado outra vez**: quem não estiver aprovado não usa a app.

## Restrições e regras alteradas

- **Rede:** usam a rede só o login, os pedidos e as aprovações (Firestore: nome, email e estado) e o alerta por email. **As medições nunca saem do aparelho**, exceto quando o utilizador as envia de propósito.
- Tudo gratuito: Firestore no plano Spark e Apps Script na conta pessoal.

## Testes

- **Unitários:** `alerta.js` (sem URL não envia; erro de rede não lança) e a lógica de decisão de estado na porta de acesso.
- **e2e com o adaptador falso** (o estado guardado em `fake-auth.acessos`):
  - pedido → ecrã de espera;
  - aprovação pelo administrador → o utilizador entra;
  - retirar acesso → bloqueio;
  - conta antiga sem pedido → pedido pendente criado;
  - faixa de pendentes para o administrador;
  - botão "Enviar ao administrador" (descarga e mensagem).
- **Regras do Firestore:** não há emulador neste ambiente. São verificadas por revisão e pelo primeiro uso real.
