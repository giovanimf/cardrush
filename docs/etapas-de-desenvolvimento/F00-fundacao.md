# F0 — Fundação

**Objetivo:** criar as peças que todas as outras etapas usam: relógio, erros, dinheiro, constantes de regra e a trava de produção.
**Depende de:** 00. **Estimativa:** meio dia.

## Passos

- [x] **F0.1 Estrutura de pastas.** Criar `server/` com uma pasta por domínio (vazias com `index.ts`) e documentar a regra: um domínio só usa outro pelo `index.ts`.
- [x] **F0.2 Relógio injetável.** `lib/clock.ts` com `clock.now()`; em modo de teste aceita deslocamento (`setOffset`). Nenhum código de negócio chama `new Date()` ou `Date.now()` direto.
- [x] **F0.3 Catálogo de erros.** `lib/errors.ts` com `AppError(code, data?)` e a lista de códigos em inglês (ver tabela abaixo). Um helper converte `AppError` em resposta HTTP com `{ code, message, data }`.
- [x] **F0.4 Dinheiro.** `lib/money.ts` com `parseMoneyToCents` (aceita `1.234,56`, `1234,56`, `1234.56`; recusa mais de 2 casas) e `formatMoney` via `Intl`.
- [x] **F0.5 Constantes de regra.** `lib/rules.ts` com `RULES` (duração mínima 5 min, janela 2 min, passo 2 min, teto 10 min, teto de depósito, intervalos de polling, TTL do passe) e cada regra com seu ID (`BR-...`) em comentário.
- [x] **F0.6 Trava de produção.** Em `lib/env.ts`: se `NODE_ENV=production` e `TEST_MODE=1`, ou alguma chave secreta vazia ou igual à de desenvolvimento, o app não sobe. Adicionar ao schema as chaves `AUDIT_SECRET`, `PSEUDONYM_SECRET`, `TEST_MODE` (todas no `.env.example`). _(também TURNSTILE_PASS_SECRET; instrumentation.ts barra o app na subida)_
- [ ] **F0.7 Revisão.** `npx tsc --noEmit` e `npx eslint` sem erros; commit. _(typecheck e lint ok; commit pendente, a pedido)_

## Códigos de erro (iniciais)

`AUTH_REQUIRED`, `FORBIDDEN`, `VALIDATION_FAILED`, `NOT_FOUND`, `INTERNAL_ERROR`, `TURNSTILE_FAILED`,
`BID_INVALID_AMOUNT`, `BID_AUCTIONEER_NOT_ALLOWED`, `BID_LOT_CANCELLED`, `BID_LOT_NOT_STARTED`, `BID_LOT_ENDED`,
`BID_ALREADY_LEADING`, `BID_BELOW_MINIMUM`, `BID_INSUFFICIENT_BALANCE`, `DEPOSIT_INVALID_AMOUNT`,
`LOT_NOT_FOUND`, `LOT_NOT_OWNED`, `LOT_ITEM_ALREADY_AUCTIONED`, `LOT_CANCEL_HAS_BIDS`, `LOT_CANCEL_ENDED`,
`SEARCH_UNAVAILABLE`, `SEARCH_RATE_LIMITED`, `ITEM_UNAVAILABLE`, `RECEIPT_NOT_FOUND`,
`EMAIL_ALREADY_REGISTERED`, `INVALID_CREDENTIALS`.

## Pronto quando

O app se recusa a subir com `NODE_ENV=production` e uma chave padrão; typecheck e lint passam.

## Diário

| Data | Passo | O que mudou | Consumo |
|---|---|---|---|
| 2026-10-23 | F0.1–F0.6 | server/<domínio>/index.ts + server/README.md; lib/clock, errors, money, rules; trava de produção em lib/env + instrumentation.ts. Testados parseMoneyToCents e a trava com NODE_ENV=production | — |
| 2026-10-23 | F0.7 | tsc e eslint sem erros; commit não feito | — |
