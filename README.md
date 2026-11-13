# Flechas — verificação de flechas por visada

App de campo para verificar flechas de condutores e cabos de guarda em linhas MAT, a partir de leituras de teodolito. Suporta os métodos internacional e português. O contexto completo está no `CLAUDE.md`.

- **iPhone e PC:** PWA instalável. Funciona offline.
- **Android:** APK instalado diretamente, sem Play Store.
- **Acesso:** login por email (Firebase Auth), com contas criadas e desativadas pelo administrador. A app funciona sem rede até 7 dias.
- **Medições:** guardadas só no aparelho, com exportação para JSON e CSV.
- **Vistas:** cabo a cabo, ou boletim do vão com os 8 cabos (tabela no tablet, separadores no telemóvel).
- **Modos:** verificação (leitura → flecha → conforme) e regulação (parâmetro → leitura a apontar).
- **Temperatura:** local à mão, correção de fluência para CC e CG, flecha ou parâmetro pela tabela de 5 em 5 °C com interpolação.

A configuração e a instalação estão descritas passo a passo em **[docs/configuracao.md](docs/configuracao.md)**.

## Estrutura

- `index.html`, `src/`: a app
  - `calc/`: vista cabo a cabo, cálculo de um cabo (`compute.js`) e temperatura (`temperatura.js`)
  - `boletim/`: boletim do vão (estado e interface)
  - `access/`: login e prazo offline
  - `history/`: histórico de medições
  - `update/`: aviso de APK novo
  - `platform/`: gravação de ficheiros na web ou no Android
- `core/flechas-core.mjs`: núcleo de cálculo, sem interface e validado contra a folha LBL
- `data/postes.json`: tabela de 485 tipos de apoio
- `tests/`: testes unitários (`node --test`)
- `e2e/`: testes no browser (Playwright)
- `android/`: projeto Android gerado pelo Capacitor
- `.github/workflows/`: testes (`ci.yml`) e publicação da PWA e do APK (`release.yml`)
- `app/calculadora-flechas.html`: versão antiga de ficheiro único (Documents by Readdle). Já não é atualizada.
- `calculadora/flechas_nspire.txt`: versão para a TI-Nspire CX CAS
- `referencia/`: documento Word, folha Excel LBL e foto da app existente

## Desenvolvimento

Requer o Node.js 22.

    npm install
    npm run dev        # servidor local
    npm test           # testes unitários (cálculo, prazo, histórico)
    npm run e2e        # testes no browser (usa login falso, VITE_AUTH=fake)
    npm run build      # PWA em dist/
    npx cap sync android   # copia dist/ para o projeto Android
