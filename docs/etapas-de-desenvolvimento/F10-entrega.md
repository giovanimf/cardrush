# F10 — Entrega

**Objetivo:** dados de teste, testes Playwright, hospedagem, README e relato de uso de IA.
**Depende de:** F0 a F9 (o frontend pode andar em paralelo). **Estimativa:** 1 dia.

## Passos

- [x] **F10.1 Seed.** Pelos serviços de domínio (senão a auditoria nasce inválida): 1 leiloeiro, 2 licitantes com saldo; lotes ao vivo com lances e fim distante, agendado, encerrado com arremate e comprovante, encerrado sem lances; horários relativos ao momento do seed. Idempotente. _(server/demo; rodado no banco de dev; liquidação pausada por advisory lock durante o seed)_
- [x] **F10.2 Ganchos de teste.** Com `TEST_MODE=1`: `POST /api/test/reset`, `POST /api/test/clock` (`now`, `advanceMs`, `reset`), `POST /api/test/catalog` (modo da Scryfall), `POST /api/test/run-closer`. Fora do modo de teste devolvem 404.
- [x] **F10.3 Playwright.** Instalar e configurar; fluxos principais: cadastro e login, depósito, lance e recusa, tempo real com dois navegadores, prorrogação, encerramento e comprovante, auditoria adulterada por SQL, Scryfall fora, Turnstile com chaves de teste. _(17 testes verdes; banco E2E no schema e2e, endpoint direto do Neon)_
- [ ] **F10.4 Hospedagem.** Decidir (Vercel + Neon, ou servidor Node fixo) e configurar o gatilho da liquidação; deploy público. _(decisão e passos no README; deploy pendente: depende das contas e chaves do dono do projeto)_
- [x] **F10.5 README.** Configuração passo a passo, usuários de teste, API escolhida e limites, técnica de auditoria com receitas SQL para adulterar, decisões ambíguas (prorrogação, tempo real), limitações, como rodar os testes, chaves de teste do Turnstile.
- [x] **F10.6 Relato de IA.** Onde e como a IA foi usada e o que foi revisado (usar os Diários destas etapas como fonte).
- [ ] **F10.7 Revisão final.** Typecheck, lint, Playwright verde, deploy no ar, commit. _(typecheck, lint, i18n e Playwright verdes; deploy e commit pendentes)_

## Pronto quando

Quem avalia percorre o fluxo inteiro só com os usuários do seed e o link público.

## Diário

| Data | Passo | O que mudou | Consumo |
|---|---|---|---|
| 2026-10-26 | F10.1 | seedDemo pelos serviços (relógio deslocado): 2 ao vivo com lances, 1 agendado, 1 vendido com comprovante, 1 sem lances; idempotente; auditoria de todos íntegra | — |
| 2026-10-26 | F10.2 | POST /api/test/reset, /clock, /catalog, /run-closer (404 fora do TEST_MODE) | — |
| 2026-10-26 | F10.3 | Playwright: servidor próprio (porta 3100, .next-e2e, TEST_MODE, liquidação a cada 1 s), aquecimento das rotas, 17 testes cobrindo todos os fluxos pedidos | — |
| 2026-10-26 | Bugs achados | search_path vazando pelo PgBouncer do Neon (SQL cru passou a qualificar o schema; pool limpo); varredura fechando lotes no meio do seed (advisory lock); Cache Components: usePathname e Date.now fora de Suspense | — |
| 2026-10-26 | F10.5–F10.6 | README reescrito (as regras de desenvolvimento ficaram no fim) e relato de uso de IA (hoje na seção "Uso de IA" do README) | — |
