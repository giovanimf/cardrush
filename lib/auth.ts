import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { nextCookies } from "better-auth/next-js"
import { env } from "@/lib/env"
import { prisma } from "@/lib/prisma"
import { RULES } from "@/lib/rules"

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, minPasswordLength: RULES.PASSWORD_MIN_LENGTH },
  session: { cookieCache: { enabled: true, maxAge: 60 * 5 } },
  user: {
    additionalFields: {
      // Gravado só no cadastro (registerUser valida o papel). Nunca muda por rota do Better Auth.
      roleId: { type: "string", required: true, input: true },
    },
    // Exclusão de conta desligada: o extrato financeiro do usuário não pode sumir
    deleteUser: { enabled: false },
  },
  // Rotas públicas do Better Auth que mexem em dados do usuário ficam fechadas:
  // - cadastro: só pela rota própria (/api/signup), que valida o papel e o Turnstile
  // - update-user: aceitaria roleId (input: true) e deixaria o usuário trocar de papel
  // Chamadas diretas via auth.api não passam pelo roteador, então continuam funcionando.
  disabledPaths: ["/sign-up/email", "/update-user"],
  databaseHooks: {
    user: {
      update: {
        // Defesa em profundidade: nenhuma atualização feita pelo Better Auth troca o papel
        async before(user) {
          if (!("roleId" in user)) return
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { roleId, ...rest } = user
          return { data: rest }
        },
      },
    },
  },
  // Limite de tentativas de login por IP (memória do processo). Desligado no modo de teste,
  // onde os testes ponta a ponta fazem muitos logins seguidos da mesma máquina.
  rateLimit: {
    enabled: !env.TEST_MODE,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
    },
  },
  plugins: [nextCookies()],
})
