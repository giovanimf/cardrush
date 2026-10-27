import { Prisma, PrismaClient } from "@prisma/client"
import { env } from "@/lib/env"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

// Só avisos e erros no terminal; PRISMA_LOG_QUERIES=1 liga o log de cada consulta (a varredura
// de liquidação consulta o banco a cada poucos segundos e poluiria o terminal)
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: env.PRISMA_LOG_QUERIES ? ["query", "warn", "error"] : env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
})

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

// Cliente aceito pelos serviços de domínio: o prisma global ou uma transação
export type Db = PrismaClient | Prisma.TransactionClient

// Transação interativa (usada pelos casos de uso com lock)
export type Tx = Prisma.TransactionClient

// Lances concorrentes esperam o lock do lote; o timeout cobre essa fila
export function runTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn, { maxWait: 10_000, timeout: 20_000 })
}

// Schema do banco (parâmetro ?schema= da DATABASE_URL; padrão public). O SQL cru sempre
// qualifica a tabela com ele: com PgBouncer (Neon -pooler) o search_path de uma sessão pode
// vazar para outra, e um nome sem schema cairia na tabela errada.
const DB_SCHEMA = new URL(env.DATABASE_URL).searchParams.get("schema") || "public"

export function table(name: string): Prisma.Sql {
  return Prisma.raw(`"${DB_SCHEMA.replaceAll('"', '""')}"."${name.replaceAll('"', '""')}"`)
}
