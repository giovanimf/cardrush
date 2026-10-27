// Domínio catalog: catálogo de cartas (Scryfall).
// Outros domínios importam só deste arquivo, nunca de arquivos internos.
export type { CatalogItem, CatalogAttribute, CatalogSource } from "@/server/catalog/types"
export { SCRYFALL_SOURCE, normalizeScryfallCard } from "@/server/catalog/rules"
export { getCatalogSource, searchCatalog, recentCards, getCatalogItem, type CatalogSearchResult } from "@/server/catalog/service"
export {
  CATALOG_TEST_MODES,
  catalogTestStateSchema,
  getCatalogTestState,
  setCatalogTestState,
  type CatalogTestState,
} from "@/server/catalog/simulated"
