-- F8: cadeia de auditoria por lote.
-- CreateEnum
CREATE TYPE "AuditType" AS ENUM ('BID', 'EXTENSION', 'CANCELLED', 'CLOSED');

-- CreateTable
CREATE TABLE "AuditEntry" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "type" "AuditType" NOT NULL,
    "payload" JSONB NOT NULL,
    "prevHash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuditEntry_lotId_seq_key" ON "AuditEntry"("lotId", "seq");

-- AddForeignKey
ALTER TABLE "AuditEntry" ADD CONSTRAINT "AuditEntry_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- seq começa em 1 e os hashes têm o tamanho de um SHA-256 em hex (ou GENESIS no primeiro prevHash)
ALTER TABLE "AuditEntry" ADD CONSTRAINT "AuditEntry_values_check"
  CHECK ("seq" >= 1 AND length("hash") = 64 AND ("prevHash" = 'GENESIS' OR length("prevHash") = 64));
