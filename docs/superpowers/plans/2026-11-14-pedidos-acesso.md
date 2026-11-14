# Pedidos de acesso — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** pedidos de acesso na app, aprovados pelo administrador dentro da app, com alerta por email, mais o envio de medições ao administrador.

**Architecture:** o adaptador `Auth` ganha métodos de registo e de acesso, implementados no Firebase (Auth + Firestore) e no adaptador falso dos e2e. A porta de acesso (`gate.js`) passa a decidir com o estado do pedido. A administração é um módulo de interface separado.

**Spec:** `docs/superpowers/specs/2026-11-14-pedidos-acesso-design.md`

## Global Constraints
- **Administrador:** `carlosfbatista19@gmail.com`, **só** em `firestore.rules`. É detetado na app pela permissão de listar `acessos`.
- **Destino do alerta:** `carlos.batista@ren.pt`, só no Apps Script e no `mailto` de "Enviar ao administrador".
- **Textos exatos:**
  - "Pedir acesso", "Enviar pedido";
  - "O teu pedido de acesso está à espera de aprovação do administrador.";
  - "O teu acesso à app foi recusado ou retirado. Fala com o administrador.";
  - "Administração", "Aprovar", "Recusar", "Retirar acesso", "Enviar ao administrador".
- Os testes existentes continuam a passar. Os utilizadores falsos sem `estado` contam como aprovados.

## Review Focus
1. **Um erro de rede ou de permissão no Firestore** durante a verificação nunca bloqueia quem está dentro do prazo.
2. **Um utilizador pendente nunca recebe prazo (lease):** offline, mesmo com sessão, não entra.
3. **Uma conta antiga sem pedido:** é criado o pedido pendente uma vez, sem alerta.
4. **Regras do Firestore:**
   - ninguém além do administrador lista, aprova ou altera;
   - a criação só é aceite em `pendente`, com o próprio email.
5. **O email do administrador não aparece em `dist/`.**

---

### Task 1: Alerta por email
**Files:** criar `src/access/alerta.js` e `tests/alerta.test.mjs`.
- Produz `enviarAlerta({ nome, email }, { url = import.meta.env?.VITE_ALERTA_URL, fetchImpl = fetch } = {}) -> Promise<boolean>`.
- Testes:
  - "sem URL não envia" (o fetch não é chamado e devolve false);
  - "envia POST text/plain no-cors com nome e email" (verifica os argumentos);
  - "erro de rede devolve false sem lançar".

### Task 2: Adaptadores e regras
**Files:**
- modificar `src/access/auth-firebase.js`, `src/access/auth-fake.js`, `src/access/auth-errors.js` e `tests/auth-errors.test.mjs`;
- criar `firestore.rules`;
- modificar `firebase.json` (`"firestore": {"rules": "firestore.rules"}`).

**Interface nova, nos dois adaptadores:**
- `signUp(nome, email, password)`: cria a conta e o pedido. Lança um erro com `.code` em `'email-in-use' | 'weak-password' | 'invalid-email' | 'offline' | 'other'`.
- `estadoAcesso() -> 'aprovado'|'pendente'|'recusado'|'offline'`:
  - o administrador recebe sempre `'aprovado'`;
  - sem documento, cria um pedido `pendente` e devolve `'pendente'`.
- `isAdmin() -> boolean` e `listarAcessos() -> [{ uid, email, nome, estado, pedidoEm }]`.
- `decidir(uid, estado)`.

**Adaptador falso:** `fake-auth = { users: { email: { password, disabled, nome?, estado? } }, session, admin? }`. `estado` em falta conta como `'aprovado'`.

**Testes unitários:** `signUpErrorCode`, a partir de `auth/email-already-in-use`, `auth/weak-password`, `auth/invalid-email`, `auth/network-request-failed` e outros.

### Task 3: Porta de acesso e pedido
**Files:** modificar `src/access/gate.js`, `index.html` (formulário de pedido e secção `#pendente`) e `src/main.js`. Criar `e2e/pedidos.spec.mjs`.

**e2e:**
- "pedir acesso mostra o ecrã de espera";
- "pendente não entra nem offline";
- "aprovado entra";
- "recusado volta ao login com a mensagem";
- "conta antiga sem pedido fica pendente";
- "Verificar outra vez depois de aprovado entra".

### Task 4: Administração
**Files:** criar `src/access/admin-ui.js`. Modificar `index.html` (`#admin-abrir` na barra da conta e `<dialog id="admin">`) e `src/main.js`.

**e2e:**
- "administrador vê a faixa de pendentes e aprova";
- "retirar acesso";
- "não administrador não vê o botão".

### Task 5: Enviar ao administrador
**Files:** modificar `src/history/ui.js` e `index.html` (`#hist-enviar`). Acrescentar ao `e2e/history.spec.mjs` o teste "enviar ao administrador descarrega o JSON e mostra a instrução".

### Task 6: Publicação e documentação
**Files:**
- `release.yml`: publicar as regras com `firebase-tools` fixado, usando a conta de serviço; `VITE_ALERTA_URL` vem de `vars.ALERTA_URL`.
- `docs/configuracao.md`: secção 7 (Firestore, papel das regras, registo ligado, Apps Script, variável `ALERTA_URL`).
- `docs/alerta-apps-script.gs`.
- `CLAUDE.md`.
- `package.json`: versão 1.2.0.
