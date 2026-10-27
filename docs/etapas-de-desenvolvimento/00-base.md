# Etapa 00 — Base pronta ✅

O que já existe no repositório antes da F0.

## Feito

- [x] Next.js 16 (App Router, Turbopack, `cacheComponents`, `partialPrefetching`)
- [x] Better Auth com e-mail e senha (`lib/auth.ts`, `lib/auth-client.ts`, rota `app/api/auth/[...all]`)
- [x] Prisma 6.19 + PostgreSQL no Neon (`prisma/schema.prisma`, `prisma.config.ts`, 2 migrations)
- [x] Validação de variáveis de ambiente com Zod (`lib/env.ts`)
- [x] Sessão centralizada (`lib/session.ts`: `getSession`, `requireSession`)
- [x] Proxy com checagem otimista de cookie (`proxy.ts`)
- [x] Login, dashboard e logout de exemplo
- [x] Seed do admin (`prisma/seed.ts`, lê `SEED_EMAIL` e `SEED_PASSWORD`)
- [x] Projeto renomeado para CardRush (`package.json`, título do site)
- [x] Tailwind 4 instalado

## Atenção

- O banco do `.env` é **remoto (Neon)**. Nunca usar como shadow database nem rodar reset nele.
- O Prisma 6.19 exige `url = env("DATABASE_URL")` no `schema.prisma`; o aviso da extensão do VS Code é de Prisma 7 e pode ser ignorado.

## Diário

| Data | Passo | O que mudou |
|---|---|---|
| 2026-10-13 | Base | Correções de arquitetura, remoção de `src/` duplicado, migrations registradas |
| 2026-10-23 | Base | Renomeado para CardRush; plano de ação e design em `docs/` |
