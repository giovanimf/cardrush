# F6 — Lances

**Objetivo:** o motor de lances: uma transação com lock, ordem fixa de checagens, saldo comprometido, idempotência e prorrogação.
**Depende de:** F4, F5. **Estimativa:** 1 dia. **A etapa mais delicada: revise com calma.**

## Passos

- [x] **F6.1 Schema.** `Bid` (`lotId`, `seq`, `bidderId`, `amountCents`, `idempotencyKey`, `createdAt`) com `UNIQUE (lotId, seq)` e `UNIQUE (bidderId, lotId, idempotencyKey)`.
- [x] **F6.2 Regras puras.** Em `server/bidding/rules.ts`: `minAcceptableBid` (lance inicial no primeiro; depois atual + incremento) e `computeExtension(endsAt, now, extendedMs)` (≤ 2 min restantes: +2 min no fim atual, até 10 min no total).
- [x] **F6.3 Ordem de checagem.** Valor inteiro positivo → permissão `bid.place` → (transação) lote existe e travado → reenvio com a mesma chave devolve o original → cancelado → não iniciado → encerrado → já está ganhando → abaixo do mínimo → saldo insuficiente.
- [x] **F6.4 Transação.** `SELECT ... FOR UPDATE` no lote; relê o lote travado; carteiras em ordem crescente de id; compromete o novo líder e libera o anterior; grava o lance (`seq = bidCount + 1`); atualiza o lote; aplica a prorrogação. Tudo ou nada.
- [x] **F6.5 Gancho de auditoria.** Deixar o ponto de chamada `audit.append(tx, ...)` previsto (implementado na F8). _(server/audit: audit.append é um ponto de chamada vazio até a F8)_
- [x] **F6.6 Gancho de tempo real.** Depois do commit, chamar `realtime.notifyLotChanged(lotId)` (implementado na F9). Falha aqui nunca desfaz o lance. _(server/realtime: notifyLotChanged vazio até a F9)_
- [x] **F6.7 Rota.** `POST /api/lots/:id/bids` com token Turnstile, `idempotencyKey` opcional e resposta com o estado atual da sala e da carteira.
- [ ] **F6.8 Revisão.** Typecheck, lint, commit. _(typecheck e lint ok; commit pendente, a pedido)_

## Pronto quando

Inicial 100, incremento 10: A 90 recusado; A 100 aceito; A 150 já ganhando; B 105 abaixo do mínimo 110; B 110 aceito e A liberado. B e C mandando 120 juntos: só um aceito, o outro vê o novo mínimo.

## Diário

| Data | Passo | O que mudou | Consumo |
|---|---|---|---|
| 2026-10-25 | F6.1–F6.7 | Bid com UNIQUE (lotId, seq) e (bidderId, lotId, chave); minAcceptableBid e computeExtension puros; placeBid numa transação (lock do lote → reenvio → estado → já ganhando → mínimo → saldo → carteiras por id). Extra: dono do lote não dá lance nele. POST /api/lots/:id/bids devolve sala e carteira | — |
| 2026-10-25 | Testes | Cenário inteiro passou: A 90 recusado, A 100 aceito, A 150 já ganhando, B 105 abaixo de 110, B 110 aceito e A liberado; dois lances de 120 juntos: um aceito, o outro vê mínimo 130. Tabela de prorrogação (5:00, 1:30, 2:00, 2:00,001, teto) conferida | — |
