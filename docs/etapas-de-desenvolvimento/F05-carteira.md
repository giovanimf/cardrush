# F5 — Carteira

**Objetivo:** saldo total, comprometido e disponível, com depósito simples e extrato. Sem saque.
**Depende de:** F1. **Estimativa:** meio dia.

## Passos

- [x] **F5.1 Schema.** `Wallet` (`userId`, `totalCents`, `committedCents`) e `WalletEntry` (`type`, `amountCents`, referência a lote/lance, `idempotencyKey`, `createdAt`). Na migration, em SQL: `CHECK (totalCents >= 0 AND committedCents >= 0 AND committedCents <= totalCents)` e `UNIQUE (userId, idempotencyKey)`.
- [x] **F5.2 Serviço.** `server/payments/service.ts` com `getWallet`, `deposit`, `commit`, `release`, `settle`, `entries`. Todos recebem o cliente ou a transação; travam carteiras com `FOR UPDATE` em ordem crescente de `userId`.
- [x] **F5.3 Depósito.** Só o valor: > 0, até 2 casas, até o teto de `RULES`; chave de idempotência evita crédito duplo; permissão `wallet.deposit`.
- [x] **F5.4 Rotas.** Ver carteira e extrato (`wallet.view`); disponível sempre calculado (`total − comprometido`), nunca gravado.
- [ ] **F5.5 Revisão.** Typecheck, lint, commit. _(typecheck e lint ok; commit pendente, a pedido)_

## Pronto quando

Cenário fecha: deposita 500 → 500/0/500; lidera com 200 → 500/200/300; superado → 500/0/500; arremata por 200 → total 300.

## Diário

| Data | Passo | O que mudou | Consumo |
|---|---|---|---|
| 2026-10-25 | F5.1–F5.4 | Wallet (CHECK de saldo) e WalletEntry (UNIQUE userId+idempotencyKey); lockWallets em ordem de userId; deposit/commit/release/settle/entries. Rotas GET /api/wallet e POST /api/wallet/deposits | — |
| 2026-10-25 | Testes | Cenário 500/0/500 → 500/100/400 → 500/0/500 → total 300 fechou; reenvio da chave não credita duas vezes | — |
| 2026-10-25 | F0.4 (bug) | parseMoneyToCents lia "10,001" como 10001 (vírgula como milhar). Agora só ponto agrupa milhar; vírgula é sempre decimal | — |
