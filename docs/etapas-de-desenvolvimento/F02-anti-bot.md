# F2 — Anti-bot (Cloudflare Turnstile)

**Objetivo:** toda rota passa por verificação invisível. Escrita leva token novo; leitura usa um passe assinado de 4 minutos.
**Depende de:** F0. **Estimativa:** meio dia.

## Passos

- [x] **F2.1 Variáveis.** `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_ENFORCE` no `lib/env.ts` e no `.env.example`, com as chaves de teste da Cloudflare como padrão de desenvolvimento.
- [x] **F2.2 Verificação do token.** `server/security/turnstile.ts`: chama `siteverify` com timeout de 4 s; falha fechada (rede, timeout, 5xx, `internal-error` → `VERIFICATION_UNAVAILABLE`); token duplicado → `TOKEN_REUSED`; nunca guarda sucesso em cache.
- [x] **F2.3 Passe de leitura.** Cookie `ts_pass` = `expiraEm.HMAC(segredo, "turnstile-pass:" + expiraEm)`, httpOnly, SameSite=Lax, 4 min. Rota `POST /api/turnstile/verify` emite o passe após validar um token.
- [x] **F2.4 Escritas.** Helper `assertWriteToken(request)` lê o cabeçalho `cf-turnstile-response` (ou campo do formulário nas server actions) e valida antes de qualquer outra checagem.
- [x] **F2.5 Leituras.** No `proxy.ts`, validar o `ts_pass` localmente (assinatura e validade) para páginas e GETs de API. Exceções: saúde, `POST /api/turnstile/verify` e rotas de teste com `TEST_MODE=1`.
- [x] **F2.6 Erro único.** Toda recusa vira `403 TURNSTILE_FAILED` com mensagem genérica e `data.reason`.
- [ ] **F2.7 Revisão.** Typecheck, lint, commit. _(typecheck e lint ok; commit pendente)_

## Chaves de teste

Site key que passa `1x00000000000000000000BB`, que falha `2x00000000000000000000BB`.
Secret que valida `1x0000000000000000000000000000000AA`, que reprova `2x0000000000000000000000000000000AA`, duplicado `3x0000000000000000000000000000000AA`.

## Pronto quando

Escrita sem token recebe 403 `TURNSTILE_FAILED`; leitura sem passe recebe 403; com passe válido, leitura passa sem chamar a Cloudflare.

## Diário

| Data | Passo | O que mudou | Consumo |
|---|---|---|---|
| 2026-10-23 | F2.1–F2.6 | server/security/turnstile.ts, POST /api/turnstile/verify, proxy com ts_pass (página sem passe mostra /verify), login e cadastro mandam token. Testado com curl e com as chaves de teste 1x/2x/3x | — |
