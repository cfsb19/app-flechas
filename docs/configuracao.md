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

## 3. Publicação automática (GitHub → Firebase Hosting)

Cada alteração no ramo `main` do GitHub corre os testes e gera o APK Android. Depois publica a app e o APK no Firebase Hosting. Isto só acontece se a configuração abaixo estiver completa. Se faltar alguma coisa, o processo para e não publica nada, e o erro diz o que falta.

### 3.1 Alojamento

1. Na consola do Firebase, abre **Hosting → Começar** e avança os passos. Não precisas de instalar nada.
2. Anota o endereço da app: `https://<id-do-projeto>.web.app`.
3. No ficheiro `.firebaserc`, troca `PREENCHER` pelo id do projeto.

### 3.2 Chave para o GitHub publicar

1. Na [consola Google Cloud](https://console.cloud.google.com/iam-admin/serviceaccounts), com o mesmo projeto selecionado, cria uma conta de serviço chamada `github-publicar`.
2. Dá-lhe os papéis **Administrador do Firebase Hosting** (*Firebase Hosting Admin*) e **Utilizador da conta de serviço** (*Service Account User*).
3. No separador **Chaves**, cria uma chave do tipo **JSON**. O ficheiro é descarregado para o teu computador. Trata-o como uma palavra-passe.
4. No GitHub, abre o repositório e vai a **Settings → Secrets and variables → Actions**:
   - em **New repository secret**, cria o segredo `FIREBASE_SERVICE_ACCOUNT` e cola o conteúdo completo do ficheiro JSON;
   - no separador **Variables**, cria a variável `HOSTING_URL` com o endereço da app, por exemplo `https://flechas-ren.web.app`.
5. Apaga o ficheiro JSON do computador.

### 3.3 Chave de assinatura do APK

O Android só aceita atualizações de um APK assinado sempre com a mesma chave. **Se a chave se perder, cada pessoa tem de desinstalar a app e instalar de novo, e perde as medições que não tiver exportado.** Guarda uma cópia num sítio seguro.

1. Num computador com Java instalado (não pode ser o PC da REN), corre:

   ```
   keytool -genkeypair -v -keystore flechas.jks -alias flechas -keyalg RSA -keysize 2048 -validity 10000
   ```

   O comando pede uma palavra-passe e alguns dados. Os dados podem ser quaisquer.
2. Converte a chave para texto:
   - Windows (PowerShell): `[Convert]::ToBase64String([IO.File]::ReadAllBytes("flechas.jks")) > flechas.txt`
   - Mac/Linux: `base64 -w0 flechas.jks > flechas.txt` (no Mac, sem o `-w0`)
3. No GitHub, em **Settings → Secrets and variables → Actions**, cria estes segredos:
   - `ANDROID_KEYSTORE_BASE64`: o conteúdo de `flechas.txt`
   - `ANDROID_KEYSTORE_PASSWORD`: a palavra-passe da chave
   - `ANDROID_KEY_ALIAS`: `flechas`
   - `ANDROID_KEY_PASSWORD`: a mesma palavra-passe, a não ser que tenhas escolhido outra para o alias

### 3.4 Publicar

- Junta as alterações ao ramo `main`, ou abre **Actions → Publicar (PWA + APK) → Run workflow**.
- Para os telemóveis Android receberem o aviso de versão nova, aumenta o número `version` no `package.json` (por exemplo de `1.0.0` para `1.0.1`).

Os limites gratuitos do Firebase Hosting (10 GB guardados e 360 MB transferidos por dia) chegam para uma equipa pequena.

## 4. Instalar nos telemóveis

**iPhone:**
1. Abre o endereço da app no **Safari**. Tem de ser o Safari.
2. Toca em **Partilhar** e depois em **Adicionar ao ecrã principal**.
3. Abre a app pelo ícone que aparece no ecrã principal.
- A app funciona sem rede. É preciso abri-la com internet pelo menos uma vez a cada 7 dias.

**Android:**
1. Abre `https://<id-do-projeto>.web.app/flechas.apk` no telemóvel.
2. Quando o telemóvel pedir, autoriza o browser a **instalar apps desconhecidas**.
3. Quando houver uma versão nova, a app mostra um aviso com o botão **Descarregar**.
- A PWA (Chrome → menu → **Instalar app**) também funciona no Android, mas o APK é o recomendado.

**PC (Edge ou Chrome):** abre o endereço. Se a política da empresa o permitir, o ícone **Instalar** na barra de endereço instala a app.

**Cópia de segurança das medições:** em **Histórico → Exportar JSON**, guarda o ficheiro onde quiseres. Para recuperar as medições num telemóvel novo, usa **Importar**.

## 5. Usar a app

**Vistas:** no topo, escolhe **Cabo a cabo** (um cabo de cada vez) ou **Boletim do vão** (os 8 cabos de uma vez). No tablet na horizontal, o boletim aparece como uma tabela. No telemóvel, tem um separador por cabo.

**Modos:**
- **Verificação:** escreves as leituras do teodolito e a flecha teórica. A app dá a flecha medida e diz se está **Conforme** ou **Não conforme**.
- **Regulação:** escreves o parâmetro da tabela de regulação. A app dá a **leitura a apontar** no teodolito, as leituras que ainda contam como conformes e a flecha correspondente.

**Temperatura:**
- Escreve a **temperatura local**. Durante o dia, a app propõe a última que escreveste.
- A **correção de temperatura** (fluência) é diferente para os condutores (CC) e para os cabos de guarda (CG), e fica guardada.
- A temperatura de cálculo é a local menos a correção.
- Com **Pela tabela**, a app pede a flecha (ou o parâmetro) das linhas de 5 em 5 °C de que precisa:
  - uma só linha se a temperatura de cálculo for múltiplo de 5;
  - as linhas de baixo e de cima nos outros casos, e a app interpola.

**Boletim:**
- Os dados comuns (vão, geometria, temperatura, flecha ou parâmetro de cada grupo) escrevem-se uma vez.
- Em cada cabo escrevem-se só as leituras.
- Os cabos sem leituras são ignorados.
- Se um cabo tiver uma flecha ou um parâmetro diferente do resto do grupo, carrega em **Valor próprio** nesse cabo.
- **Guardar boletim** guarda o vão inteiro no histórico. Se o boletim foi aberto a partir do histórico, o registo existente é atualizado.
