// Formato nosso de uma carta, independente da fonte externa
export type CatalogAttribute = { key: string; value: string }

export type CatalogItem = {
  source: string
  sourceId: string
  // Pode faltar na fonte (ou no modo simulado no_title); a interface decide o texto
  title: string | null
  setName: string | null
  rarity: string | null
  releasedAt: string | null
  imageUrl: string | null
  attributes: CatalogAttribute[]
  sourceUrl: string | null
}

// Fonte de cartas. Só o domínio catalog fala com a API externa, sempre por esta interface.
export interface CatalogSource {
  // 404/400 viram lista vazia; 429 lança SEARCH_RATE_LIMITED; rede ou 5xx lança SEARCH_UNAVAILABLE
  search(query: string): Promise<CatalogItem[]>
  // Carta que sumiu da fonte devolve null
  getById(sourceId: string): Promise<CatalogItem | null>
}
