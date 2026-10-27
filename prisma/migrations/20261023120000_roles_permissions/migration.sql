-- F1: papéis e permissões como dados.
-- Escrita à mão a partir do `prisma migrate diff`: usuários que já existem
-- (o admin do seed) precisam de um papel antes de roleId virar NOT NULL.

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "publicSignup" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- Papéis padrão. As permissões e os vínculos vêm do ensureBaseData() (seed).
INSERT INTO "Role" ("id", "name", "publicSignup")
VALUES (gen_random_uuid()::text, 'bidder', true),
       (gen_random_uuid()::text, 'auctioneer', true);

-- AlterTable: nullable primeiro, preenche, depois NOT NULL
ALTER TABLE "User" ADD COLUMN "roleId" TEXT;

-- Usuários existentes (admin do seed) viram leiloeiros
UPDATE "User" SET "roleId" = (SELECT "id" FROM "Role" WHERE "name" = 'auctioneer');

ALTER TABLE "User" ALTER COLUMN "roleId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "User_roleId_idx" ON "User"("roleId");

-- E-mail único sem diferenciar maiúsculas (o Prisma não expressa índice por expressão)
CREATE UNIQUE INDEX "User_email_lower_key" ON "User"(LOWER("email"));

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
