import { createAuthClient } from "better-auth/react"

// Sem baseURL o client usa a mesma origem da página, evitando divergência de env
export const authClient = createAuthClient()
