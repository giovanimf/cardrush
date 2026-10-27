-- Auditoria: o histórico financeiro não some junto com o usuário (Restrict em vez de Cascade)
-- e índice parcial para a vitrine ao vivo.

-- DropForeignKey
ALTER TABLE "Wallet" DROP CONSTRAINT "Wallet_userId_fkey";

-- DropForeignKey
ALTER TABLE "WalletEntry" DROP CONSTRAINT "WalletEntry_userId_fkey";

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletEntry" ADD CONSTRAINT "WalletEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Vitrine ao vivo e varredura de liquidação filtram lotes ativos ordenando pelo fim
CREATE INDEX "Lot_active_endsAt_idx" ON "Lot"("endsAt") WHERE "cancelledAt" IS NULL AND "closedAt" IS NULL;
