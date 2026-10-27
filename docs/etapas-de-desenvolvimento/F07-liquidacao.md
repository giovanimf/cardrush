# F7 — Liquidação e comprovante

**Objetivo:** encerrar cada lote uma única vez, mover o dinheiro e emitir o comprovante público.
**Depende de:** F6. **Estimativa:** meio dia.

## Passos

- [x] **F7.1 Schema.** `Receipt` (`lotId` único, `code` único, `finalCents`, `bidCount`, `winnerId`, `chainHead`, `issuedAt`).
- [x] **F7.2 Código.** `generateReceiptCode()`: 12 caracteres de um alfabeto sem ambíguos (sem `0 O 1 I L`), gerador criptográfico com amostragem por rejeição.
- [x] **F7.3 closeLot(id).** Transação com lock no lote; relê: já encerrado, cancelado ou fim prorrogado → não faz nada. Sem lances: `UNSOLD`, sem dinheiro. Com líder: `settle` (vencedor: total e comprometido − valor; leiloeiro: total + valor), resultado e comprovante juntos.
- [x] **F7.4 closeDueLots().** Lotes vencidos e não encerrados, do mais antigo ao mais novo, cada um na sua transação; falha em um não trava os outros.
- [x] **F7.5 Gatilho.** Rota protegida por `CRON_SECRET` que chama `closeDueLots()`; o mecanismo (cron externo ou processo a cada segundo) é definido na F10 com a hospedagem. _(GET/POST /api/cron/close-lots com Bearer CRON_SECRET; também varredura no processo com SETTLEMENT_SWEEP_MS, ligada no .env local)_
- [x] **F7.6 Rotas.** Comprovante público `GET /api/receipts/:code`; meus arremates (`bids.view_own`).
- [ ] **F7.7 Revisão.** Typecheck, lint, commit. _(typecheck e lint ok; commit pendente, a pedido)_

## Pronto quando

Chamar `closeLot` duas vezes no mesmo lote debita uma vez só; o comprovante abre sem login e sem dados pessoais.

## Diário

| Data | Passo | O que mudou | Consumo |
|---|---|---|---|
| 2026-10-25 | F7.1–F7.6 | Receipt; generateReceiptCode (31 símbolos, rejeição); closeLot idempotente sob lock; closeDueLots em lotes de 50, um por transação; rota de cron; varredura no instrumentation.ts; GET /api/receipts/:code público e GET /api/me/wins | — |
| 2026-10-25 | Testes | closeLot duas vezes debita uma vez; sem lances vira UNSOLD sem comprovante; comprovante abre sem login e sem dados pessoais; dinheiro conservado em todas as carteiras | — |
