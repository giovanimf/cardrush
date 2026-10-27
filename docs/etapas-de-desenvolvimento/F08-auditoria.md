# F8 — Auditoria e privacidade

**Objetivo:** histórico de cada lote à prova de adulteração, verificável por qualquer pessoa, sem expor dados pessoais.
**Depende de:** F6, F7. **Estimativa:** meio dia.

## Passos

- [x] **F8.1 Schema.** `AuditEntry` (`lotId`, `seq`, `type`, `payload` jsonb, `prevHash`, `hash`, `createdAt`) com `UNIQUE (lotId, seq)`. _(migration 20261026120000_audit_entries, aplicada; CHECK de seq e tamanho do hash)_
- [x] **F8.2 Cadeia pura.** `server/audit/chain.ts`: JSON canônico (chaves ordenadas, sem espaços); `hash = HMAC-SHA256(AUDIT_SECRET, canonical({ lotId, seq, type, payload, prevHash, createdAt }))`; primeiro `prevHash = "GENESIS"`; `checkChain(...)` devolve `INTACT` ou `TAMPERED` com `firstBrokenSeq`.
- [x] **F8.3 append.** `audit.append(tx, lotId, type, payload)` dentro da transação que produziu o fato e sob o lock do lote; atualiza `lots.chainHead`. Tipos: `BID`, `EXTENSION`, `CANCELLED`, `CLOSED`. Ligar nos ganchos da F4 (cancelar), F6 (lance e prorrogação) e F7 (fechamento).
- [x] **F8.4 Âncoras.** Na verificação, comparar o último hash com `lots.chainHead` e `receipts.chainHead`, `lots.bidCount` com o número de `BID` e cada `BID` com a linha da tabela de lances.
- [x] **F8.5 Verificação.** Ler lote, cadeia e lances no mesmo snapshot (`RepeatableRead`); recalcular a cada acesso, nunca guardar o selo.
- [x] **F8.6 Pseudônimo.** `pseudonymFor(lotId, userId)` = 4 caracteres de `HMAC(PSEUDONYM_SECRET, ...)`; rotas públicas nunca mostram nome, e-mail ou id.
- [x] **F8.7 Rota pública.** `GET /api/lots/:id/audit` sem login.
- [ ] **F8.8 Revisão.** Typecheck, lint, commit. _(typecheck e lint ok; commit pendente, a pedido)_

## Pronto quando

Um `UPDATE` direto no banco no valor de um lance faz a auditoria mostrar Adulterado a partir daquele `seq`.

## Diário

| Data | Passo | O que mudou | Consumo |
|---|---|---|---|
| 2026-10-26 | F8.1–F8.7 | AuditEntry; chain.ts (JSON canônico, HMAC, checkChain); audit.append ligado em lance, prorrogação, cancelamento e fechamento; verifyLot com âncoras (chainHead do lote e do comprovante, contagem e linha de cada lance) em RepeatableRead; pseudonymFor; GET /api/lots/:id/audit | — |
| 2026-10-26 | Testes | Cenário com SQL direto: valor (seq 2), payload (seq 1), autor, horário, remoção no meio e no fim → Adulterado no seq certo; desfeito → Íntegro. Troca de ordem barrada por UNIQUE/CHECK | — |
