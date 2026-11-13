# Verificação de flechas por visada

App de campo para verificar flechas de condutores e cabos de guarda em linhas MAT, a partir de leituras de teodolito. Métodos internacional e português. Ver `CLAUDE.md` para o contexto completo.

## Estrutura

- `app/calculadora-flechas.html` – protótipo funcional (abre no browser, sem instalação)
- `core/flechas-core.mjs` – núcleo de cálculo, sem interface
- `tests/` – casos de validação (folha LBL) e testes
- `data/postes.json` – tabela de tipos de apoio
- `calculadora/flechas_nspire.txt` – versão TI-Nspire CX CAS (TI-Basic)
- `referencia/` – documento Word, folha Excel LBL e foto da app existente

## Testes

Precisa de Node.js 18 ou mais recente. Na raiz do projeto:

    node --test
