# Dark mode

**Objetivo:** tema escuro completo, que segue o sistema por padrão e tem uma chave no topo (Sistema, Claro, Escuro) que fica salva no navegador.
**Depende de:** Frontend (F11). **Estimativa:** meio dia a 1 dia.
**Referência:** o guia de design já previa "dark mode (opcional)" na Onda 4 ([../design/index.html](../design/index.html)).

## Diagnóstico (26/10/2026)

O app tem um tema só, e as cores estão espalhadas:

| Onde | O que tem | Problema para o escuro |
|---|---|---|
| `app/globals.css`, `:root` | 26 variáveis (`--ink`, `--cream`, `--line`, `--text`…) | `--ink` é a cor de texto **e** o fundo da barra superior, do rodapé e dos botões escuros. No escuro, o texto precisa clarear e a barra não. |
| `app/globals.css`, regras | `#fff` 22 vezes (painéis, campos, modal, botões contornados, comprovante, barra de lance); `#33415e` 6×; `#9fb0ce` 8×; `#c2cfe6` 2×; sombras `rgba(13, 27, 61, …)` 6× | Cores fixas não mudam com o tema. |
| `app/globals.css`, `@theme` | 15 `--color-*` copiando os mesmos valores | Duas fontes de verdade. |
| Componentes (`shell`, `room`, `receipt`, `audit`) | 15 `style={{ color: "#…" }}` | Ficam fora do tema. |
| Faixas (`.banner.ok/.warn/.bad`) | fundos claros e texto escuro fixos | Precisam de par próprio no escuro. |
| Campos nativos (data e hora no novo lote, barras de rolagem) | sem `color-scheme` | Continuam claros no escuro. |
| `app/global-not-found.tsx` | tem o próprio `<html>` | Precisa do tema também. |
| Turnstile | widget sem `theme` | Aparece claro se pedir interação. |

## Decisões

| Tema | Decisão | Por quê |
|---|---|---|
| Padrão | Segue o sistema (`prefers-color-scheme`) | Ninguém precisa configurar nada. |
| Escolha manual | Chave de 3 estados no topo, ao lado da troca de idioma; salva em `localStorage` | Não depende de login. |
| Sem "piscar" claro | Script curto no `<head>` aplica `data-theme` no `<html>` antes da pintura, com `suppressHydrationWarning` | Ler cookie no layout (`cookies()`) deixaria todas as páginas dinâmicas e quebraria o cache do Next 16 (Cache Components). |
| CSS | Tokens semânticos no `:root`; escuro em `:root[data-theme="dark"]` e em `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }` | Uma regra só por componente; nenhuma classe duplicada. |
| Marca | Barra superior, rodapé e o bloco "você venceu" continuam azul-marinho nos dois temas | Mantém a identidade. No escuro, eles se distinguem por um tom acima do fundo. |
| Destaque no escuro | Texto e links em `#6cb4ff` (o `--gold-2` atual); botão principal continua `#2e5bff` com texto branco | `#2e5bff` sobre fundo escuro não passa o contraste AA para texto. |

### Paleta final (conferida no D.6)

| Token | Claro | Escuro |
|---|---|---|
| `--bg` (fundo da página) | `#f2f5fb` | `#0a1430` |
| `--surface` (painel, campo, modal) | `#fff` | `#111f42` |
| `--surface-2` (chip, skeleton, faixa info) | `#e6edf9` | `#1a2c57` |
| `--ink` / `--ink-2` / `--ink-3` (barra, rodapé, bloco da marca) | `#0d1b3d` / … | `#172a5c` / `#1e3470` / `#2b4585` |
| `--strong` (botão escuro, aba ligada) | `#0d1b3d` | `#2b4585` |
| `--gold-soft` (fundo das cartas) | `#13254a` | `#13254a` |
| `--line` | `#d3ddee` | `#24396a` |
| `--input-line` | `#c2cfe6` | `#5872ad` (3,4:1 sobre o campo) |
| `--text` | `#0d1b3d` | `#e6edf9` |
| `--text-2` (texto secundário forte) | `#33415e` | `#c9d6ee` |
| `--muted` | `#5a6a88` | `#9aaaca` |
| `--accent-text` (links, valores em destaque) | `#2e5bff` | `#6cb4ff` |
| `--shadow-rgb` (sombras com `rgb(var(--shadow-rgb) / a)`) | `13 27 61` | `0 0 0` |
| `--green` / fundo / texto | — | `#3ccf91` / `#0f3328` / `#8be8c3` |
| `--amber` / fundo / texto | — | `#f5a524` / `#3a2a0d` / `#ffd08a` |
| `--danger` / fundo / texto | — | `#ff6b81` / `#3d1420` / `#ffb3bf` |
| `--on-status` (texto sobre selo e botão de perigo) | `#fff` | `#0a1430` |

Todos os pares do escuro passam AA (4,5:1 no texto, 3:1 em borda de campo e foco). No claro, a borda de campo (`#c2cfe6` sobre branco, ~1,5:1) já vinha abaixo de 3:1 e não foi alterada para não mudar o visual aprovado.

## Passos

- [x] **D.1 Tokens.** Criar os tokens semânticos da tabela no `:root`, com os valores claros atuais (nada muda na tela). Separar `--ink` (fundo da marca) de `--text`. Fazer o `@theme` apontar para as variáveis (`@theme inline { --color-ink: var(--ink) … }`) em vez de repetir os valores.
- [x] **D.2 Trocar cores fixas.** No `globals.css`: os 22 `#fff` viram `--surface` (ou `#fff` só onde é texto sobre botão), `#33415e` vira `--text-2`, `#c2cfe6` vira `--input-line`, as sombras viram `--shadow`, e as faixas usam os pares de fundo e texto. Nos componentes: os 15 `style={{ color }}` viram classes (`.on-ink`, `.on-ink-muted`, `.accent-text`). Conferir: o app claro fica idêntico (screenshots antes e depois).
- [x] **D.3 Tema escuro.** Bloco `:root[data-theme="dark"]` e o mesmo bloco dentro de `@media (prefers-color-scheme: dark)` com `:root:not([data-theme="light"])`. Adicionar `color-scheme: light` / `dark` para os campos nativos e as barras de rolagem.
- [x] **D.4 Sem piscar.** Script inline no `<head>` de `app/[lang]/layout.tsx` e de `app/global-not-found.tsx`: lê `localStorage.theme` (com `try/catch`) e aplica `data-theme`. `suppressHydrationWarning` no `<html>`. `viewport.themeColor` com as duas cores (claro e escuro) para a barra do navegador no celular.
- [x] **D.5 Chave de tema.** Componente `ThemeSwitch` (Sistema, Claro, Escuro) no topo, ao lado do idioma; no celular, dentro do menu. Botão com `aria-label` e `aria-pressed`, alvo de 44 px, chaves de tradução em `pt.ts` e `en.ts`. O Turnstile recebe `theme: "auto"`.
- [x] **D.6 Revisão visual e contraste.** Passar por todas as telas nos dois temas: home, vitrine, sala (ganhando, superado, prorrogado, reconectando, encerrado), carteira, meus arremates, comprovante, auditoria (íntegro e adulterado), painel, novo lote, login, cadastro, modal de cancelar, 404 e celular. Conferir o contraste AA (4,5:1 no texto, 3:1 nas bordas de campo e no foco) e ajustar a paleta.
- [x] **D.7 Testes.** Novo `e2e/theme.spec.ts`:
  - com `colorScheme: "dark"`, o fundo do `<body>` é o escuro;
  - escolher "Claro" com o sistema escuro vale e continua depois de recarregar;
  - `data-theme` já está no `<html>` na primeira resposta (sem piscar);
  - a chave tem nome acessível.

  Rodar a suíte inteira: os 23 testes atuais continuam verdes.
- [x] **D.8 Fechamento.** Typecheck, lint, paridade do i18n, `next build`. Atualizar o README (seção de telas) e o painel das etapas.

## Riscos

- **Imagens das cartas:** a sombra preta some no fundo escuro. Trocar por borda fina `--line` no tema escuro, se ficar apagado.
- **Telas do protótipo** (`docs/design/`) continuam só claras. É só referência, não precisa mudar.
- **Esquecer uma cor fixa:** o passo D.2 termina com um `grep` por `#fff`, `#33415e` e `style={{ color` sem resultado fora dos tokens.

## Diário

| Data | Passo | O que mudou | Consumo |
|---|---|---|---|
| 2026-10-26 | D.1–D.8 | Tokens semânticos no `:root` com o escuro em `[data-theme="dark"]` e no `prefers-color-scheme`; cores fixas do CSS e dos componentes trocadas por tokens; script do tema no `<head>` via `InlineScript` (servidor manda `text/javascript`, cliente `text/plain`, sem o aviso de `<script>` do React); `themeColor` claro/escuro; Turnstile `theme: "auto"`; `e2e/theme.spec.ts` (3 testes); suíte inteira verde (26); `next build` ok | — |
| 2026-10-26 | Desvios do plano | **D.5:** a chave é um botão só que alterna Sistema → Claro → Escuro (rótulo diz o atual e o próximo), em vez de 3 botões com `aria-pressed`; não há menu no celular, então ela fica na barra do topo com alvo de 44 px. **D.2:** cores dos componentes viraram `var(--…)` no próprio `style`, sem classes novas. **Fontes:** as variáveis das fontes estavam no `<body>`, mas o Tailwind as resolve no `:root`, então as fontes do design (Space Grotesk, IBM Plex, JetBrains Mono) nunca eram aplicadas; as classes foram para o `<html>` e o visual muda nos dois temas. Fontes e raios ficam num `@theme` comum (o `@theme inline` não publica as variáveis no `:root`). | — |
| 2026-10-26 | Extra | Busca do topo: era um link fixo para a vitrine; virou campo que leva a `/lots?q=`, e o filtro da vitrine passou a buscar no servidor (nome ou coleção, todas as páginas). Teste novo em `e2e/public.spec.ts`. | — |
