# F4 — Lotes

**Objetivo:** leiloeiro cria lote a partir de uma carta, revisa, publica (agora ou agendado) e cancela se ainda não houver lances; vitrine por estado.
**Depende de:** F1, F3. **Estimativa:** 1 dia.

## Passos

- [x] **F4.1 Schema.** `Lot` com cópia completa da carta (`source`, `sourceItemId`, título, imagem, atributos, URL), `startingBidCents`, `minIncrementCents`, `startsAt`, `endsAt`, `originalEndsAt`, `extendedMs`, `currentBidCents`, `leaderId`, `bidCount`, `chainHead`, `cancelledAt`, `closedAt`, `outcome`, `sellerId`. Sem coluna de estado. _(migration 20261025120000_lots_wallet_bids_receipts, aplicada)_
- [x] **F4.2 Índice parcial.** Na migration, em SQL: `UNIQUE (source, sourceItemId) WHERE cancelledAt IS NULL AND closedAt IS NULL`. Violação vira `LOT_ITEM_ALREADY_AUCTIONED`.
- [x] **F4.3 Estado derivado.** `lotState(lot, now)` pura em `server/lots/rules.ts`: cancelado → encerrado gravado → antes do início (agendado) → antes do fim (ao vivo) → encerrado. Fim exclusivo.
- [x] **F4.4 Criar.** Validações com todos os campos de uma vez (`VALIDATION_FAILED { fields }`): lance inicial > 0, incremento > 0, início não no passado ("agora" usa `clock.now()`), fim > início, duração ≥ 5 min. Sem edição depois de publicar.
- [x] **F4.5 Cancelar.** Só o dono (`LOT_NOT_OWNED`), só sem lances (`LOT_CANCEL_HAS_BIDS`), não encerrado (`LOT_CANCEL_ENDED`); lock `FOR UPDATE` no lote; idempotente.
- [x] **F4.6 Vitrine.** Listagem por aba: ao vivo (fim mais próximo), agendados (início mais próximo), encerrados (mais recentes); paginação de 12; cancelados nunca aparecem.
- [x] **F4.7 Painel do leiloeiro.** Meus lotes com resultado e total recebido (`lot.view_own`).
- [ ] **F4.8 Revisão.** Typecheck, lint, commit. _(typecheck e lint ok; commit pendente, a pedido)_

## Pronto quando

A mesma carta em dois lotes ativos é recusada; lote com lance não cancela; cancelado some da vitrine.

## Diário

| Data | Passo | O que mudou | Consumo |
|---|---|---|---|
| 2026-10-25 | F4.1–F4.7 | Lot + índice parcial e CHECKs em SQL; lotState e validateLotInput puros; createLot (cópia da carta, com fallback para cartas guardadas se a Scryfall cair), cancelLot com FOR UPDATE, vitrine por aba, painel com total recebido. Rotas: GET/POST /api/lots, GET /api/lots/:id, POST /api/lots/:id/cancel, GET /api/me/lots. "Em leilão" da busca (F3) ligado | — |
| 2026-10-25 | Testes | Cenários no banco: carta em 2 lotes ativos recusada, lote com lance não cancela, cancelado some da vitrine e libera a carta; também via HTTP | — |
