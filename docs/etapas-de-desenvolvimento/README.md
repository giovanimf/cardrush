# Etapas de desenvolvimento — CardRush

Roteiro de construção do CardRush em etapas pequenas. Serve para três coisas:

1. **Economizar créditos de IA**: cada pedido para a IA cobre um passo só, e a IA lê só o arquivo da etapa, não o projeto inteiro.
2. **Medir o gasto**: cada etapa tem uma linha no painel abaixo para anotar quanto consumiu.
3. **Retomar de onde parou**: se o crédito acabar no meio, os checkboxes `[x]` e o diário mostram o último passo concluído.

Referências: plano de ação em [../plano-de-acao/index.html](../plano-de-acao/index.html) e design em [../design/index.html](../design/index.html).

## Como usar

1. Abra a etapa atual (a primeira com status diferente de ✅ no painel).
2. Peça **um passo por vez** para a IA, com o prompt da seção "Prompt para retomar".
3. Ao terminar o passo: marque `[x]` no arquivo da etapa e escreva uma linha no **Diário** da etapa.
4. Ao terminar a etapa: atualize o painel (status, datas e consumo) e faça um commit.

Regra de ouro: **um commit por passo concluído**. Se o crédito acabar, o que está commitado está feito; o que não está, refaça a partir do último `[x]`.

## Painel

Status: ⬜ não iniciada · 🟨 em andamento · ✅ concluída · ⏸️ pausada

| Etapa | Arquivo | Status | Início | Fim | Sessões | Consumo | Observações |
|---|---|---|---|---|---|---|---|
| 00 Base pronta | [00-base.md](00-base.md) | ✅ | 2026-10-13 | 2026-10-23 | — | — | Next 16, Better Auth, Prisma 6.19, Neon, renomeado para CardRush |
| F0 Fundação | [F00-fundacao.md](F00-fundacao.md) | 🟨 | 2026-10-23 | | | | Falta só o commit |
| F1 Permissões | [F01-permissoes.md](F01-permissoes.md) | 🟨 | 2026-10-23 | | | | Falta só o commit |
| F2 Anti-bot | [F02-anti-bot.md](F02-anti-bot.md) | 🟨 | 2026-10-23 | | | | Falta só o commit |
| F3 Catálogo Scryfall | [F03-catalogo.md](F03-catalogo.md) | 🟨 | 2026-10-23 | | | | Falta só o commit ("Em leilão" na F4) |
| F4 Lotes | [F04-lotes.md](F04-lotes.md) | 🟨 | 2026-10-25 | | | | Falta só o commit |
| F5 Carteira | [F05-carteira.md](F05-carteira.md) | 🟨 | 2026-10-25 | | | | Falta só o commit |
| F6 Lances | [F06-lances.md](F06-lances.md) | 🟨 | 2026-10-25 | | | | Falta só o commit (auditoria e tempo real na F8/F9) |
| F7 Liquidação | [F07-liquidacao.md](F07-liquidacao.md) | 🟨 | 2026-10-25 | | | | Falta só o commit (mecanismo final do cron na F10) |
| F8 Auditoria | [F08-auditoria.md](F08-auditoria.md) | 🟨 | 2026-10-26 | | | | Falta só o commit |
| F9 Tempo real | [F09-tempo-real.md](F09-tempo-real.md) | 🟨 | 2026-10-26 | | | | Falta só o commit (polling) |
| F10 Entrega | [F10-entrega.md](F10-entrega.md) | 🟨 | 2026-10-26 | | | | Falta deploy (contas do dono) e commit |
| Frontend | [F11-frontend.md](F11-frontend.md) | 🟨 | 2026-10-26 | | | | Falta só o commit |
| F12 Dark mode | [F12-dark-mode.md](F12-dark-mode.md) | 🟨 | 2026-10-26 | | | | Falta só o commit |

**Consumo**: anote o que o Claude Code mostrar ao fim da sessão (custo ou tokens da tela de uso). Basta um número aproximado por etapa; o objetivo é ver quais etapas pesam mais.

## Prompt para retomar

Copie e troque `FXX` pela etapa atual:

```text
Leia docs/etapas-de-desenvolvimento/README.md e docs/etapas-de-desenvolvimento/FXX-*.md.
Execute apenas o próximo passo não marcado. Leia só os arquivos que o passo citar.
Ao terminar: rode typecheck e lint, marque o passo com [x], escreva uma linha no Diário
da etapa e me diga o que mudou. Não avance para o passo seguinte sem eu pedir.
```

Para economizar mais: comece uma conversa nova a cada etapa (o histórico longo custa créditos em toda resposta).

## Decisões já tomadas (resumo)

| Tema | Decisão |
|---|---|
| Produto | Leilão de cartas de Magic via API pública Scryfall |
| Stack | Next.js 16 (App Router), React 19, Better Auth, Prisma 6.19, PostgreSQL (Neon), Tailwind 4 |
| Código | Inglês; comentários em português; interface em inglês e português (i18n) |
| Dinheiro | Centavos inteiros (`*Cents`), nunca float |
| Tempo | Só o relógio do servidor, por um relógio injetável (`clock.now()`) |
| Papéis | Permissões como dados (Role, Permission, RolePermission); o código checa permissão, nunca nome de papel |
| Prorrogação | Fim atual + 2 min quando restam ≤ 2 min; teto de 10 min por lote |
| Carteira | Depósito simples (só o valor); sem saque |
| Anti-bot | Cloudflare Turnstile invisível em escritas (token) e leituras (passe de 4 min) |
| Tempo real | Recomendado: polling (2 s logado na sala, 5 s visitante, 10 s vitrine), atrás de uma interface. Confirmar na F9 |
| Testes | Playwright, configurado na F10; código testável desde o início |
| Responsividade | Na etapa de frontend, com Tailwind, mobile primeiro |
| Hospedagem | Decidida na F10 |

## Estrutura de pastas combinada

```text
app/                      rotas (páginas e route handlers); páginas finas
components/               componentes de interface
lib/                      núcleo: env, prisma, auth, session, clock, errors, money
server/<domínio>/         regras e serviços de cada domínio (só servidor)
  rules.ts                funções puras, sem banco
  service.ts              casos de uso; recebem o cliente do banco ou a transação
prisma/                   schema, migrations e seed
docs/                     plano de ação, design e estas etapas
```

Domínios: `auth`, `security`, `catalog`, `lots`, `payments`, `bidding`, `settlement`, `audit`, `realtime`.
