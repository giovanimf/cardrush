# Frontend

**Objetivo:** as telas do design em Next.js + Tailwind, responsivas e em inglês e português.
**Depende de:** os serviços das etapas correspondentes. **Estimativa:** 1 a 2 dias.
**Referência visual:** [../design/index.html](../design/index.html) (pode ser trocada pela nova imagem de inspiração).

## Passos

- [x] **FE.1 Tema.** Levar cores, fontes e raios de `docs/design/styles.css` para o `@theme` do Tailwind; fontes Space Grotesk, IBM Plex Sans e JetBrains Mono.
- [x] **FE.2 i18n.** Inglês e português; todo texto em arquivos de tradução; erros traduzidos pelo `code` da API; teste de paridade das chaves. _(npm run test:i18n: 408 chaves e 26 códigos de erro em pt e en)_
- [x] **FE.3 Layout de app.** Mobile primeiro; barra de abas fixa embaixo no celular; bottom sheet para depósito, confirmação e cancelamento; alvos de toque ≥ 44 px. _(barra de abas, formulário de lance fixo e modal como bottom sheet no celular; deposit fica no painel da carteira)_
- [x] **FE.4 Telas públicas.** Home, vitrine, sala (visitante), comprovante, auditoria (íntegro e adulterado).
- [x] **FE.5 Conta.** Cadastro com papel, login.
- [x] **FE.6 Licitante.** Carteira, sala ao vivo e seus estados (ganhando, superado e recusado, prorrogação, reconectando, encerrado), meus arremates.
- [x] **FE.7 Leiloeiro.** Painel, novo lote (buscar, condições, revisar e publicar), busca com API fora, cancelar.
- [x] **FE.8 Transversais.** Estados vazios, lote não encontrado, imagem indisponível, falha do Turnstile; `data-testid` estáveis para o Playwright.
- [ ] **FE.9 Revisão.** Typecheck, lint, conferência no celular, commit. _(typecheck e lint ok; teste de celular no Playwright; commit pendente)_

## Diário

| Data | Passo | O que mudou | Consumo |
|---|---|---|---|
| 2026-10-26 | FE.1–FE.8 | app/[lang] com i18n por rota (proxy escolhe pelo cookie ou navegador); tema do design no @theme; telas: home, vitrine, sala (ganhando, superado, prorrogado, reconectando, encerrado, cancelado), auditoria, comprovante, login/cadastro, carteira, meus arremates, painel, novo lote em 3 passos; 404 global; data-testid estáveis | — |
