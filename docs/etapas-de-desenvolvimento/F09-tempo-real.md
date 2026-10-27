# F9 — Tempo real

**Objetivo:** a sala e a vitrine se atualizam sozinhas, sem recarregar a página.
**Depende de:** F6, F7. **Estimativa:** meio dia.

**Decisão recomendada (confirmar ao iniciar):** polling, atrás de uma interface, para trocar por SSE ou Socket.IO depois sem mexer nas regras.

## Passos

- [x] **F9.1 Confirmar a técnica.** Polling (recomendado), SSE ou Socket.IO; registrar aqui e no README. _(polling, registrado no README e em server/realtime)_
- [x] **F9.2 Rota leve de estado.** `GET /api/lots/:id/room` devolve só o necessário (lance atual, mínimo, fim vigente, número de lances, últimos lances com pseudônimo ou "Você", posição do usuário, `serverNow`). Sem montar a página.
- [x] **F9.3 Interface.** `server/realtime/index.ts` com `notifyLotChanged(lotId)`; no polling é um no-op ou só invalida cache. É o único ponto que muda se a técnica mudar.
- [x] **F9.4 Intervalos.** Sala logado 2 s; sala visitante 5 s; vitrine 10 s; após dar um lance, buscar na hora; aba em segundo plano pausa.
- [x] **F9.5 Relógio no navegador.** O cronômetro conta sozinho a partir de `serverNow` (diferença entre relógios); o polling só corrige o fim quando há prorrogação.
- [ ] **F9.6 Revisão.** Typecheck, lint, commit. _(typecheck e lint ok; commit pendente, a pedido)_

## Pronto quando

Com dois navegadores, o lance de um aparece no outro sem recarregar, em até 2 s.

## Diário

| Data | Passo | O que mudou | Consumo |
|---|---|---|---|
| 2026-10-26 | F9.1–F9.5 | Polling atrás de server/realtime; GET /api/lots/:id/room com lances recentes ("you" ou pseudônimo), posição e serverNow; usePolled (2 s logado, 5 s visitante, 10 s vitrine, pausa em segundo plano, para quando fecha); useServerNow para o cronômetro | — |
