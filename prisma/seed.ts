// O seed cria histórico com o relógio deslocado (clock.setOffset), que só existe no modo de teste.
// Vale só para este processo; o servidor continua com o TEST_MODE do .env.
process.env.TEST_MODE = "1"

import "dotenv/config"

async function main() {
  const email = process.env.SEED_EMAIL
  const password = process.env.SEED_PASSWORD
  const bidderPassword = process.env.SEED_BIDDER_PASSWORD

  if (!email || !password || !bidderPassword) {
    throw new Error("Defina SEED_EMAIL, SEED_PASSWORD e SEED_BIDDER_PASSWORD no .env antes de rodar o seed.")
  }

  // Import depois de ligar o TEST_MODE: o env é lido na primeira importação
  const { seedDemo } = await import("../server/demo")
  const { prisma } = await import("../lib/prisma")

  try {
    await seedDemo({ adminEmail: email, adminPassword: password, bidderPassword })
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
