# CardRush

Casa de leilões online de cartas de Magic: The Gathering. Leiloeiros montam lotes a partir de cartas da API pública **Scryfall**; licitantes depositam saldo simulado e disputam ao vivo; **qualquer pessoa, sem login, audita** o histórico de lances de um lote e confere se ele foi adulterado.

**Link:** https://cardrush.187.41.98.72.sslip.io/

**Logins para testes:**

| Usuário | Papel | E-mail | Senha |
|---|---|---|---|
| Helena Duarte | Leiloeira | `helena.duarte@cardrush.com` | `Admin123456!` |
| Marina Costa | Licitante | `marina.costa@cardrush.com` | `bOqFZW-GcF-1kFk6` |
| Rafael Lima | Licitante | `rafael.lima@cardrush.com` | `bOqFZW-GcF-1kFk6` |

Esses usuários são criados pelo seed a partir de variáveis de ambiente (`SEED_EMAIL`, `SEED_PASSWORD` e `SEED_BIDDER_PASSWORD`), para não deixar senhas fixas no código. Elas estão expostas aqui de propósito, só para testes: são contas de demonstração com saldo simulado, que cobrem as principais funcionalidades e não representam risco para o sistema. Se quiser, é fácil trocar: basta alterar o `.env` e rodar o seed de novo.

**Stack:** Next.js 16 (App Router, Turbopack, Cache Components), React 19, TypeScript, Better Auth, Prisma 6 + PostgreSQL (Neon), Tailwind 4, Cloudflare Turnstile, Playwright.

---

**Apresentação do projeto:** a página pública [`/apresentacao`](http://localhost:3000/apresentacao) resume o que foi feito, as decisões técnicas e traz um vídeo de 3 minutos com as telas reais.

## Como rodar

### 1. Pré-requisitos

- **Node.js 20 ou mais novo** (com npm).
- **Um PostgreSQL 14+** acessível. Serve um Postgres local, um container Docker ou um gerenciado (o projeto usa [Neon](https://neon.tech), que tem plano grátis).
  - Postgres local rápido com Docker: `docker run -d --name cardrush-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=cardrush -p 5432:5432 postgres:16`
- Acesso à internet: a busca de cartas usa a API da Scryfall e o anti-bot usa o Cloudflare Turnstile (em desenvolvimento, com chaves de teste que sempre passam).

### 2. Instalar e configurar

```bash
npm install                 # instala as dependências e roda prisma generate
cp .env.example .env        # cria o arquivo de configuração
```

No `.env`, o mínimo para subir é:

1. `DATABASE_URL` e `DIRECT_DATABASE_URL` apontando para o seu banco (veja a tabela abaixo).
2. `BETTER_AUTH_SECRET` com 32+ caracteres: gere com `npx @better-auth/cli secret`.
3. `SEED_EMAIL`, `SEED_PASSWORD` e `SEED_BIDDER_PASSWORD`: o e-mail da leiloeira e as senhas das contas de demonstração.

O resto pode ficar como está no exemplo: vazio, o app usa um valor de desenvolvimento.

### 3. Criar as tabelas e os dados de demonstração

```bash
npm run db:deploy           # aplica as migrations (tabelas, índices e CHECKs)
npm run db:seed             # papéis, permissões, usuários de teste e lotes de demonstração
```

O seed é idempotente: rodar de novo não duplica nada.

### 4. Subir

```bash
npm run dev                 # http://localhost:3000
```

Abra `http://localhost:3000`: o app redireciona para `/pt` ou `/en` conforme o navegador. Na primeira visita aparece por um instante "Verificando…": é o anti-bot invisível emitindo o passe de leitura, e a página recarrega sozinha.

Para rodar como em produção: `npm run build` e `npm start`. Antes, preencha as variáveis marcadas como "produção" na tabela abaixo: o app se recusa a subir em produção com os valores de desenvolvimento.

### Variáveis do `.env`

| Variável | Obrigatória | Para que serve | Em desenvolvimento |
|---|---|---|---|
| `DATABASE_URL` | sim | Conexão que o app usa com o PostgreSQL. No Neon, use o endereço com `-pooler`. | `postgresql://postgres:postgres@localhost:5432/cardrush?schema=public` |
| `DIRECT_DATABASE_URL` | sim | Conexão direta, sem pooler, usada só pelas migrations (`prisma migrate`). O pooler do Neon prende a trava de migration. | Sem pooler: o mesmo valor de `DATABASE_URL` |
| `BETTER_AUTH_SECRET` | sim | Assina os cookies de sessão do login. Mínimo de 32 caracteres. | Gere com `npx @better-auth/cli secret` |
| `BETTER_AUTH_URL` | sim | Endereço público do app; o Better Auth confere a origem das requisições de login. Em produção precisa ser `https://`. | `http://localhost:3000` |
| `AUDIT_SECRET` | produção | Chave do HMAC da cadeia de auditoria. Fica fora do banco: sem ela não dá para recalcular hashes válidos. **Trocar a chave invalida as cadeias existentes.** | Vazio usa um valor padrão |
| `PSEUDONYM_SECRET` | produção | Chave dos pseudônimos de 4 caracteres que identificam licitantes nas páginas públicas sem expor nome nem e-mail. | Vazio usa um valor padrão |
| `TURNSTILE_PASS_SECRET` | produção | Assina o passe de leitura de 4 min (cookie `ts_pass`) emitido depois do desafio anti-bot. | Vazio usa um valor padrão |
| `CRON_SECRET` | produção | Senha da rota `GET /api/cron/close-lots`, chamada por um cron externo para fechar lotes vencidos (`Authorization: Bearer <CRON_SECRET>`). | Vazio usa um valor padrão |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | produção | Chave pública do widget Cloudflare Turnstile (vai para o navegador). | Chave de teste `1x00000000000000000000BB` (sempre passa) |
| `TURNSTILE_SECRET_KEY` | produção | Chave secreta do Turnstile, usada pelo servidor para validar cada token na Cloudflare. | Chave de teste `1x0000000000000000000000000000000AA` |
| `TURNSTILE_ENFORCE` | não | `1` exige o anti-bot em escritas e leituras; `0` desliga (proibido em produção). | `1` |
| `TEST_MODE` | não | `1` liga o relógio controlável, os modos simulados da Scryfall e as rotas `/api/test/*`. Usado só pelos testes E2E; proibido em produção. | `0` |
| `SETTLEMENT_SWEEP_MS` | não | Intervalo, em ms, da varredura que fecha lotes vencidos dentro do próprio processo. `0` desliga (use o cron externo). | `5000` |
| `SEED_EMAIL` | para o seed | E-mail da leiloeira criada pelo seed (também é o login dela). | `helena.duarte@cardrush.com` |
| `SEED_PASSWORD` | para o seed | Senha da leiloeira criada pelo seed. | Qualquer senha com 8+ caracteres |
| `SEED_BIDDER_PASSWORD` | para o seed | Senha dos dois licitantes criados pelo seed. | Qualquer senha com 8+ caracteres |
| `E2E_DATABASE_URL` | para os testes | Banco dos testes Playwright. **Precisa ser separado**: o reset dos testes apaga os dados dele. No Neon, endpoint direto (sem `-pooler`) com `?schema=e2e`. | Ex.: a mesma URL com `?schema=e2e` |
| `PRISMA_LOG_QUERIES` | não | `1` imprime cada consulta SQL no terminal, para depurar. | `0` |

"Produção" quer dizer que, com `NODE_ENV=production`, o app **não sobe** com o valor padrão: a trava em `lib/env.ts`, carregada por `instrumentation.ts`, recusa segredos padrão, chaves repetidas entre si, `TEST_MODE=1`, `TURNSTILE_ENFORCE=0`, chaves de teste da Cloudflare e `BETTER_AUTH_URL` sem https. Todas as variáveis são validadas com Zod na subida: uma variável inválida derruba o processo com a mensagem exata.

### Usuários de teste (criados pelo seed)

| Nome | Papel | E-mail | Senha |
|---|---|---|---|
| Helena Duarte | Leiloeira | valor de `SEED_EMAIL` (padrão `helena.duarte@cardrush.com`) | `SEED_PASSWORD` do `.env` |
| Marina Costa | Licitante (R$ 5.000 de saldo) | `marina.costa@cardrush.com` | `SEED_BIDDER_PASSWORD` do `.env` |
| Rafael Lima | Licitante (R$ 5.000 de saldo) | `rafael.lima@cardrush.com` | `SEED_BIDDER_PASSWORD` do `.env` |

Não existe papel de administrador: a leiloeira só cria e cancela os próprios lotes.

Lotes do seed: **Black Lotus** e **Mox Sapphire** ao vivo com lances, **Time Walk** agendado para amanhã, **Sol Ring** vendido com comprovante e **Tarmogoyf** encerrado sem lances. Os horários são relativos ao momento do seed, e tudo passa pelos serviços de domínio (a cadeia de auditoria nasce válida).

---

## O que tem

| Tela | Rota | Quem |
|---|---|---|
| Vitrine (destaque, ao vivo, agendados, encerrados; busca por nome ou coleção) | `/pt`, `/pt/lots?q=` | todos |
| Sala do lote ao vivo | `/pt/lots/:id` | todos (lance: licitante) |
| Auditoria pública | `/pt/lots/:id/audit` | todos, sem login |
| Comprovante | `/pt/receipts/:código` | todos, sem login |
| Cadastro com papel e login | `/pt/signup`, `/pt/login` | visitante |
| Carteira (depósito e extrato) | `/pt/wallet` | `wallet.view` |
| Meus arremates | `/pt/my-bids` | `bids.view_own` |
| Painel do leiloeiro e novo lote | `/pt/dashboard`, `/pt/dashboard/new` | `lot.view_own`, `lot.create` |
| Apresentação do projeto (vídeo, decisões e roteiro de avaliação) | `/pt/apresentacao` | todos, sem login |

Interface em **português e inglês** (`/pt/...` e `/en/...`; o proxy escolhe pelo cookie ou pelo navegador). Mobile primeiro: no celular a navegação vai para uma barra de abas fixa embaixo, o formulário de lance fica preso acima dela e as confirmações viram bottom sheet. **Tema claro e escuro**: segue o sistema por padrão; a chave no topo alterna Sistema, Claro e Escuro, e a escolha fica salva no navegador, sem piscar ao carregar.

### API (resumo)

Erros sempre no formato `{ code, message, data }`; a interface traduz pelo `code`.

| Método e rota | Proteção |
|---|---|
| `GET /api/lots?tab=live\|scheduled\|ended&page=` | pública |
| `POST /api/lots` | Turnstile + `lot.create` |
| `GET /api/lots/:id`, `GET /api/lots/:id/room` | pública (`/room` é o estado leve do polling) |
| `POST /api/lots/:id/bids` `{ amountCents, idempotencyKey? }` | Turnstile + `bid.place` |
| `POST /api/lots/:id/cancel` | Turnstile + `lot.cancel` (dono, sem lances) |
| `GET /api/lots/:id/audit` | pública |
| `GET /api/receipts/:code` | pública |
| `GET /api/wallet`, `POST /api/wallet/deposits` `{ amount }` | `wallet.view` / Turnstile + `wallet.deposit` |
| `GET /api/me`, `/api/me/bids`, `/api/me/lots` | sessão + permissão |
| `GET /api/catalog/search?q=` | `catalog.search` |
| `GET\|POST /api/cron/close-lots` | `Authorization: Bearer <CRON_SECRET>` |

Toda leitura (páginas e GET de API) também exige o passe do Turnstile (ver abaixo). Exceções: `/apresentacao` (página estática, sem dados do banco), `GET /api/me` (só devolve a sessão de quem pergunta), `/api/health` e a rota do cron.

---

## Regras de negócio e decisões

- **Papéis como dados.** `Role`, `Permission` e `RolePermission` no banco; o código sempre checa permissão (`requirePermission`), nunca o nome do papel. Leiloeiro tentando dar lance recebe `BID_AUCTIONEER_NOT_ALLOWED`.
- **Dinheiro em centavos inteiros** (`*Cents`). O disponível nunca é gravado: é `total − comprometido`. Um `CHECK` no banco garante total e comprometido não negativos e comprometido ≤ total.
- **Tempo só do servidor**, por um relógio injetável (`lib/clock.ts`). O navegador só calcula a diferença entre relógios para o cronômetro.
- **Estado do lote derivado**, sem coluna de estado: cancelado → encerrado gravado → antes do início (agendado) → antes do fim (ao vivo) → encerrado. Fim exclusivo.
- **Uma carta em um só lote ativo**: índice único parcial no banco (`WHERE cancelledAt IS NULL AND closedAt IS NULL`), atômico mesmo com dois leiloeiros publicando juntos.
- **Lance numa transação só**, com `SELECT ... FOR UPDATE` no lote e carteiras travadas em ordem crescente de id (a mesma ordem em lance, cancelamento e liquidação, o que evita deadlock). Ordem fixa das checagens: valor → permissão → (transação) reenvio com a mesma chave devolve o original → cancelado → não iniciado → encerrado → já ganhando → abaixo do mínimo → saldo. Dois lances iguais ao mesmo tempo: um é aceito, o outro recebe o novo mínimo.
- **Prorrogação (decisão para o enunciado ambíguo "+2 minutos")**: soma 2 min **ao fim atual**, não ao horário do lance, quando restam ≤ 2 min (janela inclusiva), com **teto de 10 min** somados por lote. A vida máxima do lote é o fim original + 10 min. Restam 1:30 → passam a restar 3:30.
- **Depósito simples**: só o valor (> 0, até 2 casas, até R$ 1.000.000,00 por depósito), com chave de idempotência contra clique duplo. Sem saque nem estorno.
- **Liquidação** fecha cada lote uma única vez, sob lock: relê o lote (já encerrado, cancelado ou fim prorrogado → não faz nada). Vencedor perde total e comprometido; leiloeiro recebe 100%. Sem lances: fecha sem dinheiro e sem comprovante. Cada lote vencido fecha na sua transação; uma falha não trava os outros.
- **Tempo real (decisão): polling** atrás de uma interface (`server/realtime`): sala a cada 2 s logado e 5 s visitante, vitrine a cada 10 s, busca imediata depois de um lance, pausa com a aba em segundo plano. Funciona em qualquer hospedagem, inclusive serverless; trocar por SSE ou Socket.IO muda só a interface e o hook do navegador.
- **Cancelamento** só pelo dono e só sem lances; quem pega o lock primeiro vence a disputa entre cancelar e o primeiro lance.

---

## Auditoria

Cada fato de um lote entra numa cadeia **HMAC-SHA256** com chave fora do banco (`AUDIT_SECRET`), dentro da mesma transação que o produziu e sob o lock do lote: **lance, prorrogação, cancelamento e fechamento**.

```
hash = HMAC(AUDIT_SECRET, json_canônico({ lotId, seq, type, payload, prevHash, createdAt }))
```

- O primeiro `prevHash` é `GENESIS`. JSON canônico (chaves ordenadas, sem espaços) deixa o hash independente da ordem das chaves no `jsonb`.
- **Âncoras:** o último hash fica em `Lot.chainHead` e no comprovante (`Receipt.chainHead`); a verificação também compara o número de lances e cada `BID` da cadeia com a linha da tabela de lances (valor, autor e horário).
- A verificação **é refeita a cada acesso**, lendo lote, cadeia, lances e comprovante no mesmo snapshot (`RepeatableRead`), e nunca é guardada.
- **Privacidade:** a auditoria, a sala e o comprovante públicos mostram licitantes só por **pseudônimo de 4 caracteres** (`HMAC(PSEUDONYM_SECRET, lotId:userId)`), diferente em cada lote. Nunca nome, e-mail ou id.

### Receitas para adulterar (e ver o selo mudar)

Pegue o id de um lote com lances (ex.: o Sol Ring do seed) e abra `/pt/lots/<id>/audit`. Rode no banco:

```sql
-- 1. Valor de um lance (tabela de lances) → "Adulterado a partir do registro" daquele lance
UPDATE "Bid" SET "amountCents" = 1 WHERE "lotId" = '<id>' AND "seq" = 2;

-- 2. Conteúdo da própria cadeia → o hash não confere mais
UPDATE "AuditEntry" SET "payload" = jsonb_set("payload", '{amountCents}', '1') WHERE "lotId" = '<id>' AND "seq" = 1;

-- 3. Autor trocado
UPDATE "Bid" SET "bidderId" = (SELECT "id" FROM "User" WHERE "email" = 'rafael.lima@cardrush.com') WHERE "lotId" = '<id>' AND "seq" = 1;

-- 4. Horário alterado
UPDATE "AuditEntry" SET "createdAt" = "createdAt" - interval '1 second' WHERE "lotId" = '<id>' AND "seq" = 1;

-- 5. Remoção no meio ou no fim
DELETE FROM "AuditEntry" WHERE "lotId" = '<id>' AND "seq" = 2;
```

Recarregue a página de auditoria: o selo vira **Histórico adulterado** e mostra a partir de qual registro. Para desfazer, volte o valor original (ou rode `npm run db:seed` num banco limpo).

**Limites honestos:** quem tiver a chave **e** o banco juntos consegue refazer a cadeia; cortar o fim reescrevendo todas as âncoras (lote e comprovante) não é detectado. Troca de ordem é bloqueada pelas próprias restrições do banco (`UNIQUE (lotId, seq)` e `CHECK`).

---

## API externa: Scryfall

- Cliente em `server/catalog/scryfall-client.ts`: fila com **100 ms entre chamadas** (pedido da Scryfall), cabeçalhos de identificação, timeout de 5 s. 404/400 viram lista vazia; 429 vira `SEARCH_RATE_LIMITED { retryAfterSec }`; rede ou 5xx vira `SEARCH_UNAVAILABLE`.
- **Só a busca do leiloeiro depende da Scryfall.** O lote guarda uma cópia da carta, então vitrine, salas, lances e comprovantes continuam funcionando com a API fora. Com ela fora, a busca avisa e oferece as **cartas consultadas recentemente** (guardadas no banco).
- Modos simulados para testes (`TEST_MODE=1`): `normal`, `down`, `rate_limited`, `no_image`, `no_title` e ids "sumidos".

---

## Anti-bot: Cloudflare Turnstile

Captcha invisível, validado no servidor:

- **Escritas** (login, cadastro, lance, depósito, criar e cancelar lote) levam um token novo no cabeçalho `cf-turnstile-response`, verificado na Cloudflare antes de qualquer outra checagem. Falha fechada: rede, timeout ou erro da Cloudflare recusam.
- **Leituras** usam um passe assinado de 4 min (cookie `ts_pass`, httpOnly), validado localmente no proxy sem chamar a Cloudflare. Sem passe, a página mostra a verificação, resolve o desafio invisível e recarrega sozinha; o passe é renovado em segundo plano.
- Toda recusa é `403 TURNSTILE_FAILED` com mensagem genérica e `data.reason` (`TOKEN_MISSING`, `TOKEN_INVALID`, `TOKEN_REUSED`, `PASS_MISSING`, `PASS_EXPIRED`, `VERIFICATION_UNAVAILABLE`…).

**Chaves de teste** (padrão em desenvolvimento, proibidas em produção):

| | Passa | Falha | Token repetido |
|---|---|---|---|
| Site key (invisível) | `1x00000000000000000000BB` | `2x00000000000000000000BB` | — |
| Secret | `1x0000000000000000000000000000000AA` | `2x0000000000000000000000000000000AA` | `3x0000000000000000000000000000000AA` |

Para produção: crie um widget Turnstile (modo invisível, grátis, sem mudar DNS) no painel da Cloudflare e coloque a site key e a secret nas variáveis de ambiente.

---

## Testes

```bash
npm run check        # typecheck + lint + paridade das traduções (pt/en)
npm run test:e2e     # Playwright (sobe um servidor próprio na porta 3100)
```

Os testes ponta a ponta usam um banco separado (`E2E_DATABASE_URL`, por exemplo um schema `e2e` no mesmo Postgres) porque **o reset dos testes apaga os dados dele**. No Neon, use o endpoint direto (sem `-pooler`) para o E2E. O servidor de teste roda com `TEST_MODE=1`, pasta `.next-e2e` (pode rodar ao lado do `npm run dev`), chaves de teste do Turnstile e liquidação a cada 1 s.

Cobertura: vitrine, busca e idiomas; tema claro/escuro (segue o sistema, escolha salva sem piscar); permissões (visitante, licitante no painel, leiloeiro na sala); cadastro e login (com Turnstile real em modo de teste); depósito; lance recusado e aceito; **tempo real com dois navegadores e um visitante**; prorrogação; encerramento, comprovante público e meus arremates; **auditoria adulterada por SQL**; Scryfall fora do ar; assistente de novo lote e cancelamento; Turnstile recusando escrita sem token e leitura sem passe; layout de celular; página de apresentação abrindo sem login e sem verificação, com o vídeo.

Ganchos de teste (só com `TEST_MODE=1`; fora dele respondem 404): `POST /api/test/reset`, `POST /api/test/clock` (`now`, `advanceMs`, `reset`), `POST /api/test/catalog` (modo da Scryfall), `POST /api/test/run-closer`.

---

## Estrutura

```text
app/[lang]/        páginas (finas) por idioma
app/api/           rotas HTTP
components/        interface (views por tela, provedores, moldura)
lib/               env, prisma, clock, errors, money, rules, i18n, cliente HTTP
server/<domínio>/  regras puras (rules.ts) e casos de uso (service.ts) — auth, security,
                   catalog, lots, payments, bidding, settlement, audit, realtime, demo
prisma/            schema, migrations (índice parcial e CHECKs em SQL) e seed
e2e/               testes Playwright
public/apresentacao/ vídeo e capa servidos pela página /apresentacao (gerados por `npm run publish` em video/)
video/             vídeo de apresentação (Remotion + telas gravadas pelo Playwright; ver video/README.md)
docs/              plano de ação, design, etapas de desenvolvimento e revisão interna
```

Um domínio só usa outro pelo `index.ts` dele (`server/README.md`). Regras de negócio citam um ID (`BR-...`) em `lib/rules.ts`.

**Server × Client Components:** as páginas são Server Components finos; as telas são Client Components porque dependem do navegador (polling da sala e da vitrine, cronômetro corrigido pelo relógio do servidor, token Turnstile em cada escrita). Toda regra e validação continua no servidor.

---

## Limitações conhecidas

- Valores em `int` no banco: teto de R$ 10 milhões por lance e R$ 20 milhões por carteira.
- Polling, não push: mudanças chegam em até 2 s (logado) ou 5 s (visitante).
- Sem saque, estorno, comissão ou cancelamento de lote com lances (fora do escopo).
- O cadastro não confirma e-mail.
- Sem Docker Compose: o projeto espera um PostgreSQL já disponível (veja o comando `docker run` em [Como rodar](#como-rodar)).

## Uso de IA

O setup foi feito à mão: banco PostgreSQL no Neon, projeto Next.js e as integrações (Better Auth, Prisma, Cloudflare Turnstile e a API da Scryfall). Depois usei IA para a implementação, aplicando técnicas que aprendi na pós-graduação e em projetos profissionais. Nem tudo o que eu queria coube no prazo; o que ficou de fora está em [Limitações conhecidas](#limitações-conhecidas).

### Como o trabalho foi organizado

1. **Requisitos do sistema.** O ponto de partida: o que a plataforma precisa fazer, regra por regra.
2. **Plano de ação** ([docs/plano-de-acao/index.html](docs/plano-de-acao/index.html)): produto, regras de negócio com cenários de aceite, modelo de dados, decisões de segurança e a ordem das fases.
3. **Design das telas** ([docs/design/](docs/design/index.html)): as telas desenhadas antes do código.
4. **Roteiro de desenvolvimento** ([docs/etapas-de-desenvolvimento/](docs/etapas-de-desenvolvimento/README.md)): o plano de ação mapeado em etapas pequenas (F0 a F12), cada uma com checklist, critério de "pronto" e diário. Detalhei o que é delicado (lances, saldo, auditoria) sem poluir o resto.
   - **Por que etapas pequenas:** economizar créditos de IA. Cada pedido cobria um passo, e a IA lia só o arquivo daquela etapa, não o projeto inteiro. O checklist e o diário também permitem retomar exatamente de onde parou.
5. **Execução.** A partir desses documentos, executei todas as etapas com a IA até o fim: schema e migrations, serviços de domínio, rotas, frontend, seed, testes, documentação e o vídeo de apresentação. A IA também rodou os comandos: migrations, seed, typecheck, lint e testes.

### Como a IA foi conduzida

- **Um passo por pedido, com o documento da etapa como especificação.** O "Pronto quando" de cada etapa virou um teste executado de verdade: scripts de cenários contra o banco nas etapas F4 a F8 e Playwright a partir da F10.
- **Regras puras separadas dos casos de uso** (`rules.ts` e `service.ts`). Isso permitiu conferir prorrogação, estado do lote, lance mínimo e cadeia de auditoria com tabelas de casos, inclusive nos limites.
- **Portões em toda etapa:** a etapa só era dada como concluída com typecheck, lint e o teste dela passando.
- **Revisão independente no fim:** três revisões só de leitura (regras de negócio, segurança e banco, interface e testes), com cada achado conferido no código antes de corrigir. Foram 28 achados: 23 corrigidos com teste de regressão e 5 mantidos com o motivo registrado. Detalhes em [docs/auditoria-2026-10-26.md](docs/auditoria-2026-10-26.md).
- **Conferido pessoalmente:** a ordem das checagens e dos locks do lance, a tabela de prorrogação, a auditoria contra adulteração por SQL direto e a privacidade das rotas públicas.

### Ferramentas

| Ferramenta | Para que foi usada |
|---|---|
| **Claude Code** (VS Code e terminal) | Implementação das etapas, execução de comandos, revisões e documentação. |
| **Skills do Claude Code** em `.agents/skills/` | `frontend-design` e `ui-ux-pro-max` (interface e design system), `vercel-react-best-practices` (React e Next.js), `improve-codebase-architecture` (fronteiras de domínio). Versões travadas em `skills-lock.json`. |
| **Skills do Remotion** em `.claude/skills/` | 12 skills oficiais (`remotion-dev/skills`) usadas para montar e renderizar o vídeo. |
| **Documentação local do Next.js** | O Next.js 16 muda APIs e convenções; a IA consultou `node_modules/next/dist/docs/` antes de escrever código (regra do `AGENTS.md`). |
| **Playwright** | 27 testes ponta a ponta com servidor e banco próprios, relógio controlável e Scryfall simulada; também gravou as telas do vídeo. |
| **tsx** | Scripts de cenários das regras contra o banco (etapas F4 a F8) e a checagem de paridade das traduções. |
| **TypeScript estrito e ESLint** | Inclui as regras do React Compiler; rodam em `npm run check`. |

### Vídeo de apresentação

O vídeo usa as telas reais do sistema, sem narração e sem trilha. O código fica em [video/](video/README.md).

- **Gravação:** um roteiro do Playwright usa o app no servidor e no banco de teste. Os quadros são capturados pelo screencast do Chrome DevTools Protocol, em alta qualidade, com um registro de cada movimento, clique, tecla e rolagem.
- **Montagem:** [Remotion](https://www.remotion.dev) (vídeo escrito em React).
  - Cada cena fica numa moldura de navegador ou de celular, com cursor e efeito de clique desenhados a partir do registro, aproximações nos momentos importantes e legendas em português.
  - As esperas do servidor de desenvolvimento são cortadas automaticamente.
- **Som:** só cliques e teclas sutis, sintetizados por um script do próprio projeto.
- **Codificação:** o ffmpeg que vem com o Remotion gera o MP4 (1920×1080, 30 fps). O `npm run publish` cria a versão para a web usada na página `/apresentacao`.

Para mais detalhes, consulte a página de apresentação: [`/apresentacao`](http://localhost:3000/apresentacao).

---

## Regras de desenvolvimento do projeto

### General

- Analise a estrutura existente antes de criar ou modificar arquivos.
- Não faça alterações desnecessárias.
- Preserve a arquitetura e os padrões já utilizados no projeto.
- Não remova funcionalidades existentes sem autorização.
- Antes de adicionar uma dependência, verifique se ela já existe no projeto.

### Next.js

- Utilize o App Router.
- Prefira Server Components quando não houver necessidade de interatividade no cliente.
- Use Client Components somente quando necessário.
- Antes de implementar funcionalidades específicas do Next.js, consulte a documentação disponível no projeto.
- Respeite as convenções e APIs da versão do Next.js instalada.

### TypeScript

- Utilize TypeScript.
- Evite `any`.
- Mantenha os tipos próximos ao domínio onde fizer sentido.
- Não utilize casts para simplesmente esconder erros de tipagem.

### React

- Prefira componentes pequenos e reutilizáveis.
- Evite duplicação de lógica.
- Não transforme componentes em Client Components sem necessidade.

### Código

- Antes de alterar um arquivo, entenda como ele é utilizado.
- Não reescreva arquivos inteiros quando uma alteração localizada for suficiente.
- Mantenha o padrão de nomenclatura existente.
- Não altere configurações de infraestrutura sem necessidade.

### Validação

Após alterações relevantes:

1. Execute o lint.
2. Execute os testes existentes.
3. Verifique erros de TypeScript quando aplicável.
4. Corrija problemas introduzidos pelas alterações.

### Segurança

- Nunca exponha secrets, tokens ou chaves de API.
- Nunca coloque credenciais em código-fonte.
- Não altere `.env` sem necessidade.
