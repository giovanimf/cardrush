# F1 — Identidade e permissões

**Objetivo:** papéis como conjuntos de permissões guardados no banco, cadastro com escolha de papel e guarda por permissão em toda ação.
**Depende de:** F0. **Estimativa:** meio dia.

## Passos

- [x] **F1.1 Schema.** Tabelas `Role` (`name` único, `publicSignup`), `Permission` (`key` única), `RolePermission`; `User.roleId` obrigatório. Migration nova com `--create-only`, revisada antes de aplicar. Nunca usar o banco do `.env` como shadow. _(migration 20261023120000_roles_permissions escrita à mão a partir do migrate diff, sem shadow; aplicada em 2026-10-24 com migrate deploy)_
- [x] **F1.2 Chaves conhecidas.** `server/auth/permissions.ts` com `PERMISSIONS` (`bid.place`, `wallet.view`, `wallet.deposit`, `bids.view_own`, `lot.create`, `lot.cancel`, `lot.view_own`, `catalog.search`) e `DEFAULT_ROLES` (`bidder` e `auctioneer`, ambos `publicSignup`).
- [x] **F1.3 Dados iniciais.** `ensureBaseData()` idempotente (upsert de permissões, papéis e vínculos), chamado no seed. _(feito em server/auth/service.ts; rodou no seed)_
- [x] **F1.4 Cadastro com papel.** Server action de cadastro: nome, e-mail, senha (mín. 8), papel; recusa papel sem `publicSignup`; e-mail único sem diferenciar maiúsculas. Grava o `roleId` junto com o usuário do Better Auth.
- [x] **F1.5 Usuário atual.** `getCurrentUser()` em `lib/session.ts` devolve `{ id, name, role, permissions[] }`, lido a cada request.
- [x] **F1.6 Guarda.** `requirePermission(key)` lança `AUTH_REQUIRED` (sem sessão) ou `FORBIDDEN { permission }`. Caso especial: quem tem `lot.create` e não tem `bid.place` recebe `BID_AUCTIONEER_NOT_ALLOWED` ao tentar dar lance.
- [x] **F1.7 Ajustar seed.** O admin atual vira um `auctioneer`; adicionar dois `bidder` de teste (senhas do `.env`).
- [ ] **F1.8 Revisão.** Typecheck, lint, commit. _(typecheck e lint ok; commit pendente)_

## Pronto quando

Visitante recebe 401 numa rota protegida; licitante não acessa o painel; leiloeiro não consegue dar lance.

## Diário

| Data | Passo | O que mudou | Consumo |
|---|---|---|---|
| 2026-10-23 | F1.1 | Role, Permission, RolePermission, User.roleId. A migration cria os papéis, dá auctioneer aos usuários existentes e cria índice único em LOWER(email). Não aplicada | — |
| 2026-10-23 | F1.2–F1.7 | permissions.ts, ensureBaseData, registerUser + /signup (rota pública de cadastro do Better Auth desligada), getCurrentUser, requirePermission, seed com admin + bidder1/bidder2. Dashboard exige lot.view_own | — |
| 2026-10-24 | F1.1, F1.3, F1.7 | Migration aplicada no Neon; seed rodou (admin = auctioneer, bidder1/bidder2 criados). Testado: login, bidder recebe FORBIDDEN na busca e no painel, admin acessa os dois, e-mail duplicado em maiúsculas é recusado | — |
