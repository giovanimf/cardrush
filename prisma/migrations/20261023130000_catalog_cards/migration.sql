-- CreateTable
CREATE TABLE "CatalogCard" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "title" TEXT,
    "setName" TEXT,
    "rarity" TEXT,
    "releasedAt" TEXT,
    "imageUrl" TEXT,
    "attributes" JSONB NOT NULL,
    "sourceUrl" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatalogCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CatalogCard_lastSeenAt_idx" ON "CatalogCard"("lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogCard_source_sourceId_key" ON "CatalogCard"("source", "sourceId");

