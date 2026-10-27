# F3 — Catálogo Scryfall

**Objetivo:** buscar cartas na Scryfall sem que uma queda da API afete o resto do sistema.
**Depende de:** F1. **Estimativa:** meio dia.

## Passos

- [x] **F3.1 Cliente.** `server/catalog/scryfall-client.ts`: fila com 100 ms entre chamadas, cabeçalhos `User-Agent` e `Accept`, timeout de 5 s. 404/400 na busca vira lista vazia; 429 vira `SEARCH_RATE_LIMITED { retryAfterSec }`; rede ou 5xx vira `SEARCH_UNAVAILABLE`.
- [x] **F3.2 Normalização.** Converter a carta para um `CatalogItem` nosso (id na fonte, título, coleção, raridade, lançamento, imagem, atributos `{ key, value }`, URL de origem).
- [x] **F3.3 Cartas consultadas.** Guardar no banco as cartas já vistas; com a API fora, a busca devolve `SEARCH_UNAVAILABLE { recent[] }` com essas cartas. _(model CatalogCard + migration 20261023130000_catalog_cards, aplicada em 2026-10-24)_
- [x] **F3.4 Modos simulados.** Com `TEST_MODE=1`, o cliente aceita modos `normal`, `down`, `rate_limited`, `no_image`, `no_title` e ids "sumidos"; fora do modo de teste é ignorado.
- [x] **F3.5 Rota de busca.** `GET /api/catalog/search?q=` protegida por `catalog.search`; marca "Em leilão" nas cartas com lote ativo (preparar para a F4).
- [ ] **F3.6 Revisão.** Typecheck, lint, commit. _(typecheck e lint ok; commit pendente)_

## Pronto quando

Com o cliente em modo `down`, a busca avisa e oferece as cartas consultadas; nenhuma outra rota usa a Scryfall.

## Diário

| Data | Passo | O que mudou | Consumo |
|---|---|---|---|
| 2026-10-23 | F3.1–F3.5 | scryfall-client com fila e timeout, normalização, cartas consultadas, modos simulados via POST /api/test/catalog, GET /api/catalog/search. Testado na Scryfall real; "Em leilão" fica para a F4 | — |
| 2026-10-24 | F3.3 | Migration aplicada; busca logada como leiloeiro guardou as cartas no banco | — |
