// Domínio lots: lotes de leilão.
// Outros domínios importam só deste arquivo, nunca de arquivos internos.
export { lotState, validateLotInput, type LotState, type ValidLotInput, type FieldErrors } from "@/server/lots/rules"
export {
  lockLot,
  toPublicLot,
  createLot,
  cancelLot,
  getLot,
  listShowcase,
  listSellerLots,
  SHOWCASE_TABS,
  type PublicLot,
  type ShowcaseTab,
} from "@/server/lots/service"
