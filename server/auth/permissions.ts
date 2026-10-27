// Chaves de permissão conhecidas pelo código. A atribuição a papéis fica no banco;
// esta lista só garante tipagem nas rotas e os dados iniciais (BR-AUTH-02).
export const PERMISSIONS = {
  BID_PLACE: "bid.place",
  WALLET_VIEW: "wallet.view",
  WALLET_DEPOSIT: "wallet.deposit",
  BIDS_VIEW_OWN: "bids.view_own",
  LOT_CREATE: "lot.create",
  LOT_CANCEL: "lot.cancel",
  LOT_VIEW_OWN: "lot.view_own",
  CATALOG_SEARCH: "catalog.search",
} as const

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export const ALL_PERMISSIONS = Object.values(PERMISSIONS) as PermissionKey[]

export function isPermissionKey(value: string): value is PermissionKey {
  return (ALL_PERMISSIONS as string[]).includes(value)
}

type RoleDefinition = {
  name: string
  publicSignup: boolean
  permissions: PermissionKey[]
}

// Papéis criados pelo ensureBaseData(). Um papel novo pode nascer direto no banco, sem mudar código.
export const DEFAULT_ROLES = {
  bidder: {
    name: "bidder",
    publicSignup: true,
    permissions: [PERMISSIONS.BID_PLACE, PERMISSIONS.WALLET_VIEW, PERMISSIONS.WALLET_DEPOSIT, PERMISSIONS.BIDS_VIEW_OWN],
  },
  auctioneer: {
    name: "auctioneer",
    publicSignup: true,
    permissions: [PERMISSIONS.LOT_CREATE, PERMISSIONS.LOT_CANCEL, PERMISSIONS.LOT_VIEW_OWN, PERMISSIONS.CATALOG_SEARCH],
  },
} as const satisfies Record<string, RoleDefinition>
