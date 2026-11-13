# Configuração da app Flechas

Guia passo a passo para pôr a app a funcionar. Só é preciso fazer isto uma vez.

Tudo o que aqui está é **gratuito**: o Firebase fica no plano Spark, que não pede cartão de crédito, e o GitHub Actions corre dentro da quota gratuita.

## 1. Projeto Firebase (login e alojamento)

1. Abre <https://console.firebase.google.com> com a tua conta Google e carrega em **Criar projeto**. O nome pode ser, por exemplo, `flechas-ren`. O Google Analytics não é necessário.
2. Confirma que o projeto fica no plano **Spark** (gratuito). Nunca mudes para o plano Blaze.
3. Em **Authentication → Começar**, abre o separador **Método de início de sessão** (*Sign-in method*) e ativa **Email/palavra-passe**. Deixa desligada a opção "Link de email".
4. **Desliga o registo público. Este passo é obrigatório.** Em **Authentication → Definições → Ações do utilizador** (*User actions*), desmarca **Ativar criação (registo)** (*Enable create (sign-up)*).
   - Se esta opção não aparecer, a consola propõe atualizar para o *Firebase Authentication with Identity Platform*. A atualização é gratuita no plano Spark. Faz a atualização e repete o passo.
5. Em **Authentication → Modelos** (*Templates*), muda o idioma dos emails para **Português**.
6. Em **Definições do projeto → As tuas apps**, adiciona uma app **Web** (ícone `</>`) chamada `Flechas`. Não ativas o Hosting nesse ecrã.
7. Copia os quatro valores `apiKey`, `authDomain`, `projectId` e `appId` para `src/access/firebase-config.js`, no lugar de `PREENCHER`. Estes valores não são secretos e podem ir para o repositório.

### Comprovar que o registo público está mesmo desligado

Este passo não pode ficar por fazer. Se o registo estiver ligado, qualquer pessoa com a app consegue criar uma conta.

Corre este comando num terminal, com a tua `apiKey`:

```
curl -s -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=A_TUA_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"email":"teste@exemplo.pt","password":"teste123","returnSecureToken":true}'
```

A resposta tem de conter `ADMIN_ONLY_OPERATION`. Se em vez disso trouxer um `idToken`, o registo continua ligado. Nesse caso, volta ao passo 4 e apaga o utilizador `teste@exemplo.pt` que acabou de ser criado.

## 2. Gerir utilizadores

**Dar acesso a uma pessoa:**
1. Vai a **Authentication → Utilizadores → Adicionar utilizador** e indica o email da pessoa com uma palavra-passe temporária qualquer.
2. Diz à pessoa para abrir a app, escrever o email e carregar em **Esqueci-me da palavra-passe**. Vai receber um email para escolher a palavra-passe dela.

**Cortar o acesso:**
1. Vai a **Authentication → Utilizadores**, abre o menu ⋮ da pessoa e escolhe **Desativar conta**.
2. A app dessa pessoa fica bloqueada assim que tiver internet. Sem internet, fica bloqueada no máximo 7 dias depois da última confirmação.

**Reativar uma conta:** usa o mesmo menu. As medições que a pessoa tinha no telemóvel continuam lá.

No servidor fica guardado apenas o email de cada pessoa. As medições nunca saem do telemóvel.
