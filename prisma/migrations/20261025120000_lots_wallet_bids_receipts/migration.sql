-- F4 a F7: lotes, carteira, lances e comprovantes.
-- Gerada com prisma migrate diff; o final (índice parcial e CHECKs) é SQL escrito à mão,
-- porque o Prisma não expressa índice parcial nem CHECK.

-- CreateEnum
CREATE TYPE "LotOutcome" AS ENUM ('SOLD', 'UNSOLD');

-- CreateEnum
CREATE TYPE "WalletEntryType" AS ENUM ('DEPOSIT', 'COMMIT', 'RELEASE', 'SETTLEMENT_DEBIT', 'SETTLEMENT_CREDIT');

-- CreateTable
CREATE TABLE "Lot" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceItemId" TEXT NOT NULL,
    "title" TEXT,
    "setName" TEXT,
    "rarity" TEXT,
    "releasedAt" TEXT,
    "imageUrl" TEXT,
    "attributes" JSONB NOT NULL,
    "sourceUrl" TEXT,
    "startingBidCents" INTEGER NOT NULL,
    "minIncrementCents" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "originalEndsAt" TIMESTAMP(3) NOT NULL,
    "extendedMs" INTEGER NOT NULL DEFAULT 0,
    "currentBidCents" INTEGER,
    "leaderId" TEXT,
    "bidCount" INTEGER NOT NULL DEFAULT 0,
    "chainHead" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "outcome" "LotOutcome",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "userId" TEXT NOT NULL,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "committedCents" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "WalletEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "WalletEntryType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "lotId" TEXT,
    "bidId" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "bidderId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "finalCents" INTEGER NOT NULL,
    "bidCount" INTEGER NOT NULL,
    "winnerId" TEXT NOT NULL,
    "chainHead" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lot_sellerId_idx" ON "Lot"("sellerId");

-- CreateIndex
CREATE INDEX "Lot_startsAt_idx" ON "Lot"("startsAt");

-- CreateIndex
CREATE INDEX "Lot_endsAt_idx" ON "Lot"("endsAt");

-- CreateIndex
CREATE INDEX "WalletEntry_userId_createdAt_idx" ON "WalletEntry"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WalletEntry_userId_idempotencyKey_key" ON "WalletEntry"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "Bid_bidderId_idx" ON "Bid"("bidderId");

-- CreateIndex
CREATE UNIQUE INDEX "Bid_lotId_seq_key" ON "Bid"("lotId", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "Bid_bidderId_lotId_idempotencyKey_key" ON "Bid"("bidderId", "lotId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_lotId_key" ON "Receipt"("lotId");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_code_key" ON "Receipt"("code");

-- CreateIndex
CREATE INDEX "Receipt_winnerId_idx" ON "Receipt"("winnerId");

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletEntry" ADD CONSTRAINT "WalletEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_bidderId_fkey" FOREIGN KEY ("bidderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- F4.2: uma carta só pode estar em um lote ativo (não cancelado e não encerrado).
-- Atômico mesmo com dois leiloeiros publicando ao mesmo tempo.
CREATE UNIQUE INDEX "Lot_active_item_key" ON "Lot"("source", "sourceItemId")
  WHERE "cancelledAt" IS NULL AND "closedAt" IS NULL;

-- F4.4: garantias de valores e datas também no banco
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_amounts_check"
  CHECK ("startingBidCents" > 0 AND "minIncrementCents" > 0 AND "bidCount" >= 0 AND "extendedMs" >= 0);
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_dates_check"
  CHECK ("endsAt" > "startsAt" AND "endsAt" >= "originalEndsAt");

-- F5.1: saldo nunca negativo e comprometido nunca maior que o total,
-- mesmo com lances simultâneos em lotes diferentes
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_balance_check"
  CHECK ("totalCents" >= 0 AND "committedCents" >= 0 AND "committedCents" <= "totalCents");

-- Extrato: valores sempre positivos (o tipo diz a direção)
ALTER TABLE "WalletEntry" ADD CONSTRAINT "WalletEntry_amount_check" CHECK ("amountCents" > 0);

-- F6.1: lance sempre positivo e seq começando em 1
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_values_check" CHECK ("amountCents" > 0 AND "seq" >= 1);
