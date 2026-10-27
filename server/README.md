# server/

Regras e serviços de cada domínio. Só roda no servidor.

```text
server/<domínio>/
  index.ts     API pública do domínio
  rules.ts     funções puras, sem banco nem framework
  service.ts   casos de uso; recebem o cliente do banco (ou a transação) por parâmetro
```

Domínios: `auth`, `security`, `catalog`, `lots`, `payments`, `bidding`, `settlement`, `audit`, `realtime`.

## Regra de dependência

Um domínio só usa outro pelo `index.ts` dele:

```ts
import { requirePermission } from "@/server/auth"          // certo
import { requirePermission } from "@/server/auth/guard"    // errado
```

Dentro do próprio domínio, os arquivos se importam livremente. `lib/` (env, prisma, clock, errors, money, rules) pode ser usado por qualquer domínio.
