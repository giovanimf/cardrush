import { auth } from "@/lib/auth"
import { clock } from "@/lib/clock"
import { prisma } from "@/lib/prisma"
// Import direto do service: o index do auth inclui a guarda, que é "server-only" e quebra no tsx
import { ensureBaseData } from "@/server/auth/service"
import { DEFAULT_ROLES } from "@/server/auth/permissions"
import { placeBid } from "@/server/bidding"
import { getCatalogSource, type CatalogItem } from "@/server/catalog"
import { createLot } from "@/server/lots"
import { deposit } from "@/server/payments"
import { closeLot, withSettlementPaused } from "@/server/settlement"

// Dados de demonstração (F10.1). Tudo passa pelos serviços de domínio, senão a cadeia de
// auditoria nasceria inválida. O histórico é criado com o relógio deslocado para o passado
// (clock.setOffset), por isso só roda com TEST_MODE=1 no processo que chama.

const MINUTE = 60_000
const HOUR = 60 * MINUTE

export const DEMO_BIDDERS = [
  { name: "Marina Costa", email: "marina.costa@cardrush.com" },
  { name: "Rafael Lima", email: "rafael.lima@cardrush.com" },
]

export const DEMO_AUCTIONEER_NAME = "Helena Duarte"

type SeedOptions = { adminEmail: string; adminPassword: string; bidderPassword: string; log?: (message: string) => void }

async function upsertUser(name: string, email: string, password: string, roleName: string) {
  const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } })
  const existing = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } })

  if (existing) {
    if (existing.roleId !== role.id) await prisma.user.update({ where: { id: existing.id }, data: { roleId: role.id } })
    return existing.id
  }

  const result = await auth.api.signUpEmail({ body: { name, email, password, roleId: role.id } })
  return result.user.id
}

// Busca a carta pelo nome exato na Scryfall
async function findCard(name: string): Promise<CatalogItem | null> {
  const items = await getCatalogSource().search(`!"${name}"`)
  return items[0] ?? null
}

// Roda fn com o relógio em "agora + offsetMs"
async function at<T>(offsetMs: number, fn: () => Promise<T>): Promise<T> {
  clock.setOffset(offsetMs)
  try {
    return await fn()
  } finally {
    clock.setOffset(0)
  }
}

const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString()

// Liquidação pausada durante o seed: o histórico nasce vencido no relógio real e a varredura
// (do próprio servidor ou do cron) fecharia os lotes no meio do caminho
export function seedDemo(options: SeedOptions) {
  return withSettlementPaused(() => seed(options))
}

async function seed({ adminEmail, adminPassword, bidderPassword, log = console.log }: SeedOptions) {
  await ensureBaseData(prisma)
  log("Permissões e papéis garantidos.")

  const sellerId = await upsertUser(DEMO_AUCTIONEER_NAME, adminEmail, adminPassword, DEFAULT_ROLES.auctioneer.name)
  const [b1, b2] = await Promise.all(
    DEMO_BIDDERS.map((bidder) => upsertUser(bidder.name, bidder.email, bidderPassword, DEFAULT_ROLES.bidder.name)),
  )
  log(`Usuários: ${adminEmail} (leiloeiro), ${DEMO_BIDDERS.map((b) => b.email).join(", ")} (licitantes).`)

  if ((await prisma.lot.count({ where: { sellerId } })) > 0) {
    log("Lotes de demonstração já existem; nada a criar.")
    return { lotsCreated: false }
  }

  const names = ["Sol Ring", "Tarmogoyf", "Black Lotus", "Mox Sapphire", "Time Walk"]
  const cards = await Promise.all(names.map(findCard))
  if (cards.some((card) => !card)) {
    log("Não foi possível buscar as cartas na Scryfall; lotes de demonstração não criados.")
    return { lotsCreated: false }
  }
  const [solRing, tarmogoyf, blackLotus, moxSapphire, timeWalk] = cards as CatalogItem[]
  const lotInput = (card: CatalogItem, startingBidCents: number, minIncrementCents: number, endsInMs: number, startsInMs?: number) => ({
    sourceItemId: card.sourceId,
    startingBidCents,
    minIncrementCents,
    startsAt: startsInMs === undefined ? null : iso(startsInMs),
    endsAt: iso(endsInMs),
  })
  const bid = (lotId: string, bidderId: string, amountCents: number) => placeBid({ lotId, bidderId, amountCents, idempotencyKey: null })

  // Saldo dos licitantes (chave de idempotência: rodar de novo não credita duas vezes)
  await at(-4 * HOUR, async () => {
    await deposit(b1, "5000,00", "seed-deposit")
    await deposit(b2, "5000,00", "seed-deposit")
  })

  // Encerrado com arremate e comprovante (Sol Ring)
  const sold = await at(-3 * HOUR, () => createLot(prisma, getCatalogSource(), sellerId, lotInput(solRing, 5000, 500, -3 * HOUR + 30 * MINUTE)))
  await at(-3 * HOUR + 5 * MINUTE, () => bid(sold.id, b1, 5000))
  await at(-3 * HOUR + 10 * MINUTE, () => bid(sold.id, b2, 5500))
  await at(-3 * HOUR + 20 * MINUTE, () => bid(sold.id, b1, 9500))
  await at(-2 * HOUR, () => closeLot(sold.id, { respectPause: false }))

  // Encerrado sem lances (Tarmogoyf)
  const unsold = await at(-2 * HOUR, () => createLot(prisma, getCatalogSource(), sellerId, lotInput(tarmogoyf, 8000, 500, -2 * HOUR + 20 * MINUTE)))
  await at(-90 * MINUTE, () => closeLot(unsold.id, { respectPause: false }))

  // Ao vivo com lances e fim distante (Black Lotus, destaque)
  const live = await at(-40 * MINUTE, () => createLot(prisma, getCatalogSource(), sellerId, lotInput(blackLotus, 400_000, 5000, 2 * 24 * HOUR)))
  await at(-35 * MINUTE, () => bid(live.id, b1, 400_000))
  await at(-30 * MINUTE, () => bid(live.id, b2, 405_000))
  await at(-20 * MINUTE, () => bid(live.id, b1, 415_000))

  // Ao vivo com um lance (Mox Sapphire)
  const live2 = await at(-10 * MINUTE, () => createLot(prisma, getCatalogSource(), sellerId, lotInput(moxSapphire, 150_000, 5000, 3 * HOUR)))
  await at(-5 * MINUTE, () => bid(live2.id, b2, 150_000))

  // Agendado para amanhã (Time Walk)
  await createLot(prisma, getCatalogSource(), sellerId, lotInput(timeWalk, 120_000, 5000, 26 * HOUR, 24 * HOUR))

  log("Lotes de demonstração: 2 ao vivo, 1 agendado, 1 vendido com comprovante, 1 sem lances.")
  return { lotsCreated: true }
}

// Volta o banco ao estado do seed (só para os testes): apaga lotes, carteiras e usuários
// que não são do seed, e semeia de novo
export async function resetDemo(options: SeedOptions) {
  const keep = [options.adminEmail, ...DEMO_BIDDERS.map((bidder) => bidder.email)].map((email) => email.toLowerCase())

  await prisma.lot.deleteMany({})
  await prisma.walletEntry.deleteMany({})
  await prisma.wallet.deleteMany({})
  await prisma.user.deleteMany({ where: { email: { notIn: keep } } })

  return seedDemo(options)
}

