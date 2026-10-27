// Domínio bidding: lances e prorrogação.
// Outros domínios importam só deste arquivo, nunca de arquivos internos.
export { minAcceptableBid, computeExtension, isValidBidAmount, type Extension } from "@/server/bidding/rules"
export {
  placeBid,
  placeBidAndDescribe,
  getRoomState,
  getRoomUpdate,
  listParticipation,
  type ParticipationStatus,
  type RoomUpdate,
  type RoomState,
  type ViewerPosition,
  type PlaceBidInput,
  type PlaceBidResult,
} from "@/server/bidding/service"
