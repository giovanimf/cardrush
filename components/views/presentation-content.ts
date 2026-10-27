import type { Locale } from "@/lib/i18n"

// Texto da página /apresentacao. Fica fora dos dicionários da interface porque é um documento
// longo; o tipo obriga pt e en a terem a mesma estrutura.
export type Status = "done" | "partial" | "todo"

export type PresentationContent = {
  meta: { title: string; description: string }
  hero: { eyebrow: string; title: string; lead: string; ctaLots: string; ctaTour: string }
  video: { title: string; hint: string; fallback: string; download: string; chapters: { time: string; label: string }[] }
  numbers: { value: string; label: string }[]
  context: { title: string; paragraphs: string[]; roles: { name: string; text: string }[] }
  requirements: {
    title: string
    intro: string
    status: Record<Status, string>
    columns: { need: string; how: string }
    groups: { name: string; items: { need: string; how: string; status: Status }[] }[]
  }
  architecture: {
    title: string
    intro: string
    layers: { name: string; path: string; text: string }[]
    domainsTitle: string
    domains: { name: string; text: string }[]
    rule: string
  }
  decisions: {
    title: string
    intro: string
    labels: { decision: string; why: string; tradeoff: string }
    items: { title: string; decision: string; why: string; tradeoff: string }[]
  }
  bidding: { title: string; intro: string; steps: string[]; note: string }
  audit: { title: string; intro: string; points: string[]; limits: string }
  security: { title: string; items: { title: string; text: string }[] }
  quality: {
    title: string
    intro: string
    items: { title: string; text: string }[]
    commandsTitle: string
    commands: { cmd: string; text: string }[]
  }
  ux: { title: string; items: { title: string; text: string }[] }
  ops: { title: string; items: { title: string; text: string }[] }
  limits: { title: string; items: string[]; nextTitle: string; next: string[] }
  tour: { title: string; intro: string; steps: { title: string; text: string; path: string; cta: string }[] }
  ai: {
    title: string
    intro: string
    organizedTitle: string
    organized: { title: string; text: string; ref?: string; note?: { title: string; text: string } }[]
    conductedTitle: string
    conducted: { title: string; text: string; ref?: string }[]
    toolsTitle: string
    toolsColumns: { tool: string; use: string }
    tools: { name: string; where?: string; use: string }[]
    videoTitle: string
    videoIntro: string
    video: { title: string; text: string; sub?: string[] }[]
    more: string
  }
}

const pt: PresentationContent = {
  meta: {
    title: "Apresentação · CardRush",
    description: "O que é o CardRush, como foi construído e as decisões técnicas por trás de cada requisito.",
  },
  hero: {
    eyebrow: "Apresentação do projeto",
    title: "Uma casa de leilões ao vivo em que qualquer pessoa pode provar que os lances não foram mexidos",
    lead:
      "O CardRush leiloa cartas de Magic: The Gathering vindas da API pública Scryfall. Leiloeiros montam lotes, licitantes disputam em tempo real com saldo simulado e a auditoria pública detecta qualquer alteração no histórico, até mesmo direto no banco. Esta página resume o que foi entregue, como foi feito e por quê.",
    ctaLots: "Ver leilões ao vivo",
    ctaTour: "Roteiro de avaliação",
  },
  video: {
    title: "O sistema em 3 minutos",
    hint: "Telas reais, gravadas a partir do próprio app. Sem narração: as legendas explicam cada passo.",
    fallback: "Seu navegador não reproduz vídeo MP4.",
    download: "Baixar o vídeo (MP4)",
    chapters: [
      { time: "0:04", label: "Vitrine e busca" },
      { time: "0:24", label: "Cadastro e depósito" },
      { time: "0:46", label: "Lances em tempo real (dois navegadores)" },
      { time: "1:08", label: "Encerramento e comprovante" },
      { time: "1:25", label: "Meus arremates e extrato" },
      { time: "1:35", label: "Auditoria detectando adulteração" },
      { time: "1:56", label: "Painel do leiloeiro" },
      { time: "2:23", label: "Tema escuro e inglês" },
      { time: "2:35", label: "Celular" },
    ],
  },
  numbers: [
    { value: "9", label: "domínios de negócio isolados" },
    { value: "27", label: "testes ponta a ponta (Playwright)" },
    { value: "7", label: "migrations versionadas" },
    { value: "422", label: "textos traduzidos (pt e en)" },
    { value: "0", label: "dados pessoais em rotas públicas" },
    { value: "28", label: "achados de revisão interna, 23 corrigidos" },
  ],
  context: {
    title: "O problema",
    paragraphs: [
      "Uma casa de leilões online em que um leiloeiro coloca itens à venda e licitantes disputam cada lote com lances ao vivo. Os itens vêm de uma API pública; aqui, cartas colecionáveis da Scryfall.",
      "O leiloeiro monta um lote a partir de um item buscado na API, com lance inicial, incremento mínimo, início e fim. O licitante deposita um saldo simulado, acompanha os lotes ao vivo, dá lances e, se vencer, recebe um comprovante que pode compartilhar por link. Qualquer pessoa, mesmo sem login, pode auditar o histórico de um lote e verificar que ele não foi adulterado.",
    ],
    roles: [
      { name: "Leiloeiro", text: "Cria e gerencia os próprios lotes. Não pode dar lances." },
      { name: "Licitante", text: "Deposita saldo, dá lances e arremata itens." },
      { name: "Visitante", text: "Vê a vitrine, acompanha as salas e audita qualquer lote sem conta." },
    ],
  },
  requirements: {
    title: "Requisitos e onde cada um foi resolvido",
    intro: "Cada linha aponta para o mecanismo que a atende. Os itens parciais ou não feitos estão marcados como tal.",
    status: { done: "Feito", partial: "Parcial", todo: "Não feito" },
    columns: { need: "Requisito", how: "Como foi atendido" },
    groups: [
      {
        name: "Interface",
        items: [
          { need: "Vitrine de lotes", how: "Abas Ao vivo, Agendados e Encerrados, com paginação e busca por nome ou coleção no servidor. Cancelados não aparecem.", status: "done" },
          { need: "Painel do leiloeiro", how: "Busca na Scryfall, assistente de novo lote (carta → preço e horários → revisão), cancelamento sem lances, resultado de cada lote e total recebido.", status: "done" },
          { need: "Sala do lote ao vivo", how: "Lance atual, histórico, sua posição, contagem regressiva corrigida pelo relógio do servidor e o aviso “Você está ganhando” ou “Você foi superado”, sem recarregar.", status: "done" },
          { need: "Carteira do licitante", how: "Saldo total, comprometido e disponível, depósito simulado com chave de idempotência e extrato.", status: "done" },
          { need: "Meus arremates", how: "Lotes em que deu lance e lotes vencidos, com comprovante e link de compartilhamento.", status: "done" },
          { need: "Página de auditoria", how: "Pública e sem login: histórico completo e selo Íntegro ou Adulterado, apontando o registro a partir do qual a cadeia quebrou.", status: "done" },
          { need: "Mensagens de feedback", how: "Cada recusa tem um código estável (abaixo do mínimo, saldo insuficiente, já está ganhando, não iniciado, encerrado…) traduzido na interface, com o valor que falta quando cabe.", status: "done" },
        ],
      },
      {
        name: "Regras de negócio",
        items: [
          { need: "API externa instável", how: "O lote guarda uma cópia da carta. Vitrine, salas, auditoria e comprovante funcionam com a Scryfall fora; só a busca do leiloeiro avisa e oferece as cartas consultadas recentemente.", status: "done" },
          { need: "Regras de lance", how: "Só em lotes ao vivo; primeiro lance ≥ inicial; demais ≥ atual + incremento; líder não cobre o próprio lance.", status: "done" },
          { need: "Saldo comprometido", how: "Disponível = total − comprometido, nunca gravado. Ao ser superado, o valor volta na mesma transação. CHECK no banco impede saldo negativo.", status: "done" },
          { need: "Prorrogação (anti-sniping)", how: "Lance com até 2 min restantes soma 2 min ao fim atual, com teto de 10 min por lote.", status: "done" },
          { need: "Liquidação", how: "Fecha cada lote uma vez, sob lock: debita o vencedor, credita o leiloeiro e gera o comprovante. Sem lances, fecha sem vencedor.", status: "done" },
          { need: "Histórico à prova de adulteração", how: "Cadeia HMAC-SHA256 com chave fora do banco, ancorada no lote e no comprovante e verificada a cada acesso.", status: "done" },
          { need: "Privacidade", how: "Licitantes aparecem só por um pseudônimo de 4 caracteres, diferente em cada lote. Nunca nome, e-mail ou id.", status: "done" },
        ],
      },
      {
        name: "Entrega",
        items: [
          { need: "React + Node + PostgreSQL", how: "Next.js 16 com React 19, rotas de API em Node, Prisma e PostgreSQL.", status: "done" },
          { need: "Dados de teste", how: "Seed idempotente: uma leiloeira, dois licitantes com saldo e lotes ao vivo com lances, agendado, vendido e sem lances.", status: "done" },
          { need: "README detalhado", how: "Passo a passo, cada variável do .env explicada, decisões, receitas de adulteração e limitações conhecidas.", status: "done" },
        ],
      },
      {
        name: "Opcionais",
        items: [
          { need: "Busca e filtro de lotes", how: "Busca no topo e na vitrine, filtrada no servidor, mais as abas por estado.", status: "done" },
          { need: "Cancelamento com estorno", how: "Cancelamento pelo dono enquanto não há lances; nesse ponto não existe saldo comprometido para devolver. Cancelar lote com lances ficou fora.", status: "partial" },
          { need: "Testes automatizados", how: "27 testes Playwright de ponta a ponta, mais cenários de regras contra o banco e checagem de paridade das traduções.", status: "done" },
          { need: "Dark mode", how: "Sistema, Claro ou Escuro, salvo no navegador e aplicado antes da primeira pintura (sem piscar).", status: "done" },
          { need: "Docker Compose", how: "Não incluído. O banco usado é um PostgreSQL gerenciado (Neon); qualquer Postgres local serve.", status: "todo" },
        ],
      },
    ],
  },
  architecture: {
    title: "Arquitetura",
    intro: "Um monólito modular: um deploy só, com fronteiras de domínio explícitas. As regras não dependem de framework e podem ser testadas sem banco.",
    layers: [
      { name: "Páginas", path: "app/[lang]/", text: "Server Components finos que só montam a tela. O idioma vem na rota." },
      { name: "Telas", path: "components/views/", text: "Client Components onde há interação real: polling, cronômetro, token anti-bot." },
      { name: "API HTTP", path: "app/api/", text: "Validação de entrada (Zod), autenticação, permissão e erros no formato { code, message, data }." },
      { name: "Domínios", path: "server/<domínio>/", text: "rules.ts com funções puras; service.ts com os casos de uso, que recebem o banco ou a transação por parâmetro." },
      { name: "Núcleo", path: "lib/", text: "env validado, Prisma, relógio injetável, dinheiro, erros e i18n." },
      { name: "Banco", path: "prisma/", text: "Schema, migrations e as garantias que só o SQL expressa: índice único parcial e CHECKs." },
    ],
    domainsTitle: "Domínios",
    domains: [
      { name: "auth", text: "sessão e permissões como dados" },
      { name: "security", text: "Turnstile e passe de leitura" },
      { name: "catalog", text: "cliente Scryfall com fila e cache" },
      { name: "lots", text: "criação, estado derivado, cancelamento" },
      { name: "payments", text: "carteira, depósito e extrato" },
      { name: "bidding", text: "lance, saldo comprometido, prorrogação" },
      { name: "settlement", text: "liquidação e comprovante" },
      { name: "audit", text: "cadeia HMAC e pseudônimos" },
      { name: "realtime", text: "contrato do tempo real (polling)" },
    ],
    rule: "Um domínio só usa outro pelo index.ts dele. Toda regra de negócio tem um ID (BR-…) em lib/rules.ts, citado no código que a aplica.",
  },
  decisions: {
    title: "Decisões técnicas",
    intro: "Cada escolha relevante foi registrada com o motivo e o custo. Estas são as que mais mudam o comportamento do sistema.",
    labels: { decision: "Decisão", why: "Por quê", tradeoff: "Custo aceito" },
    items: [
      {
        title: "Dinheiro em centavos inteiros",
        decision: "Todo valor é int em centavos (*Cents). O saldo disponível é calculado, nunca gravado.",
        why: "Ponto flutuante erra centavos; um campo derivado gravado pode divergir da fonte.",
        tradeoff: "Teto de R$ 10 milhões por lance e R$ 20 milhões por carteira com int4.",
      },
      {
        title: "Lance numa transação só, com locks em ordem fixa",
        decision: "SELECT … FOR UPDATE no lote e nas carteiras, sempre em ordem crescente de id, no lance, no cancelamento e na liquidação.",
        why: "Evita lance duplo, saldo comprometido duas vezes e deadlock entre operações concorrentes.",
        tradeoff: "Lances no mesmo lote são serializados. Para um leilão, é o comportamento correto.",
      },
      {
        title: "Estado do lote derivado do tempo",
        decision: "Sem coluna de status: cancelado → encerrado → agendado → ao vivo, calculado pelo relógio do servidor.",
        why: "Não existe job que “esquece” de virar o status; um lance após o fim é recusado na hora, mesmo antes da liquidação.",
        tradeoff: "Consultas da vitrine filtram por datas, por isso os índices em startsAt e endsAt.",
      },
      {
        title: "Tempo real por polling atrás de uma interface",
        decision: "Sala a cada 2 s logado e 5 s visitante, vitrine a cada 10 s, pausa com a aba oculta e consulta imediata após um lance.",
        why: "Funciona em qualquer hospedagem, inclusive serverless, sem conexão persistente para manter.",
        tradeoff: "Até 2 s de atraso. Trocar por SSE ou WebSocket muda só o módulo realtime e o hook do navegador.",
      },
      {
        title: "Cópia do item no lote",
        decision: "Ao criar o lote, imagem, título e atributos da carta são copiados para o banco.",
        why: "A API externa pode cair ou mudar; o leilão e o comprovante não podem depender dela.",
        tradeoff: "Correções posteriores na Scryfall não chegam a lotes já criados, o que é desejável para um registro de venda.",
      },
      {
        title: "Permissões como dados",
        decision: "Role, Permission e RolePermission no banco; o código checa permissão (lot.create, bid.place), nunca o nome do papel.",
        why: "Novos papéis, como moderador, entram sem mexer em código de regra.",
        tradeoff: "Uma consulta a mais por sessão, resolvida uma vez no carregamento.",
      },
      {
        title: "Relógio injetável",
        decision: "Toda leitura de tempo passa por lib/clock.ts. Em modo de teste, o relógio é controlado por uma rota que só existe nesse modo.",
        why: "Prorrogação e encerramento são testados de ponta a ponta sem esperar minutos reais.",
        tradeoff: "Disciplina: Date.now() direto em regra de negócio é proibido.",
      },
      {
        title: "Liquidação idempotente, com dois gatilhos",
        decision: "A mesma função fecha lotes por uma varredura no próprio processo ou por uma rota de cron protegida por segredo.",
        why: "Servidor fixo ou serverless usam a mesma regra; rodar duas vezes não fecha duas vezes.",
        tradeoff: "No modo cron, o fechamento pode atrasar até 1 min, mas lances após o fim já são recusados pelo relógio.",
      },
    ],
  },
  bidding: {
    title: "O caminho de um lance",
    intro: "A ordem das checagens é fixa e documentada, para a mesma situação sempre gerar a mesma resposta.",
    steps: [
      "Valida o valor (formato e limite) e a permissão bid.place; leiloeiro recebe BID_AUCTIONEER_NOT_ALLOWED.",
      "Abre a transação e trava o lote e as carteiras envolvidas em ordem crescente de id.",
      "Reenvio com a mesma chave de idempotência devolve o lance original, sem gravar outro.",
      "Recusa se o lote foi cancelado, ainda não começou ou já terminou (pelo relógio do servidor).",
      "Recusa se quem dá o lance já está ganhando ou se o valor está abaixo do mínimo.",
      "Recusa se o valor não cabe no saldo disponível, informando quanto falta.",
      "Grava o lance, compromete o saldo do novo líder e libera o do anterior na mesma transação.",
      "Prorroga o fim se faltavam até 2 min e acrescenta os fatos à cadeia de auditoria, ainda sob o lock.",
    ],
    note: "Dois lances iguais no mesmo instante: um é aceito e o outro recebe o novo mínimo. Esse cenário tem teste.",
  },
  audit: {
    title: "Auditoria à prova de adulteração",
    intro: "Cada fato de um lote (lance, prorrogação, cancelamento e fechamento) entra numa cadeia encadeada por hash, na mesma transação que o produziu.",
    points: [
      "A chave HMAC (AUDIT_SECRET) fica fora do banco: quem só tem acesso ao banco não consegue recalcular hashes válidos.",
      "JSON canônico (chaves ordenadas) deixa o hash independente da ordem das chaves no jsonb.",
      "Âncoras fora da cadeia: o último hash fica no lote e no comprovante, e a verificação confere também o líder, o lance atual, o fim vigente e a tabela de lances.",
      "A verificação é refeita a cada acesso, num snapshot RepeatableRead, e nunca é guardada.",
      "Alterar valor, autor ou horário, inserir ou remover um registro faz o selo virar Adulterado e apontar a partir de onde. O vídeo mostra um UPDATE direto no banco sendo detectado.",
    ],
    limits:
      "Limite assumido: quem tiver a chave e o banco ao mesmo tempo consegue refazer a cadeia inteira. Para fechar isso, o próximo passo seria publicar as âncoras num lugar externo (log append-only ou carimbo de tempo).",
  },
  security: {
    title: "Segurança",
    items: [
      { title: "Trava de produção", text: "O app se recusa a subir em produção com segredos padrão, chaves repetidas, modo de teste ligado, anti-bot desligado ou URL sem https." },
      { title: "Anti-bot invisível", text: "Cloudflare Turnstile valida no servidor cada escrita. Leituras usam um passe assinado de 4 min, checado no proxy sem chamar a Cloudflare. Falha fechada." },
      { title: "Escalada de papel bloqueada", text: "Rotas do Better Auth que alterariam o papel estão desligadas, e um hook descarta roleId em qualquer atualização. Há teste para isso." },
      { title: "Limite de tentativas", text: "Login com no máximo 10 tentativas por minuto por IP." },
      { title: "Cabeçalhos", text: "CSP com frame-ancestors 'none' contra clickjacking no botão de lance, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy e HSTS." },
      { title: "Segredos separados", text: "Chaves diferentes para sessão, auditoria, pseudônimos, passe de leitura e cron: vazar uma não compromete as outras." },
    ],
  },
  quality: {
    title: "Qualidade e testes",
    intro: "Os testes cobrem o que um usuário faz, com dois navegadores reais quando o assunto é tempo real.",
    items: [
      { title: "Ponta a ponta (Playwright)", text: "Cadastro, depósito, lance recusado e aceito, tempo real com dois navegadores, prorrogação, encerramento, comprovante, adulteração por SQL, Scryfall fora do ar, anti-bot, permissões, celular, tema e idiomas." },
      { title: "Ambiente isolado", text: "Banco próprio dos testes, servidor em outra porta e pasta, relógio controlável e modos simulados da API externa (fora, limite de taxa, sem imagem)." },
      { title: "Regras puras", text: "Prorrogação, estado do lote, mínimo e cadeia de auditoria foram conferidos com tabelas de casos, incluindo os limites (2:00 prorroga, 2:00,001 não)." },
      { title: "Revisão independente", text: "Três revisões só de leitura (regras, segurança e banco, interface e testes). Dos 28 achados, 23 foram corrigidos com teste de regressão e 5 mantidos com motivo registrado." },
    ],
    commandsTitle: "Portões antes de cada entrega",
    commands: [
      { cmd: "npm run check", text: "TypeScript estrito, lint (incluindo as regras do React Compiler) e paridade das traduções" },
      { cmd: "npm run test:e2e", text: "Suíte Playwright num servidor e banco próprios" },
      { cmd: "npm run build", text: "Build de produção com Cache Components" },
    ],
  },
  ux: {
    title: "Experiência",
    items: [
      { title: "Mobile primeiro", text: "No celular a navegação vira barra de abas, o formulário de lance fica preso acima dela, confirmações viram bottom sheet e todo alvo de toque tem pelo menos 44 px." },
      { title: "Acessibilidade", text: "Foco preso nos modais e devolvido ao fechar, rótulos em todos os controles, movimento reduzido respeitado e contraste conferido nos dois temas." },
      { title: "Português e inglês", text: "Rota com idioma (/pt, /en), escolha pelo cookie ou pelo navegador, moeda e datas no formato de cada idioma." },
      { title: "Erros que explicam", text: "A API responde códigos estáveis; a interface diz o motivo e o que fazer, como o valor mínimo ou quanto falta de saldo." },
    ],
  },
  ops: {
    title: "Operação",
    items: [
      { title: "Configuração validada", text: "Variáveis lidas uma vez e validadas com Zod na subida; uma variável errada derruba o processo com a mensagem exata." },
      { title: "Duas formas de hospedar", text: "Servidor Node fixo, com a varredura de liquidação no próprio processo, ou serverless com um cron externo chamando a rota protegida." },
      { title: "Migrations revisadas", text: "Conexão direta para migrar (sem o pooler) e as garantias em SQL (índice parcial, CHECKs) revisadas a cada migration gerada." },
      { title: "Health check", text: "Rota /api/health para o monitor da hospedagem." },
    ],
  },
  limits: {
    title: "Limitações conhecidas",
    items: [
      "Polling, não push: mudanças chegam em até 2 s logado e 5 s como visitante.",
      "Sem saque, comissão ou cancelamento de lote que já tem lances.",
      "O cadastro não confirma e-mail.",
      "Quem tem ao mesmo tempo a chave de auditoria e o banco consegue refazer a cadeia.",
      "Sem Docker Compose; o projeto espera um PostgreSQL já disponível.",
    ],
    nextTitle: "Próximos passos",
    next: [
      "Trocar o polling por SSE quando a hospedagem permitir conexões longas.",
      "Publicar as âncoras da auditoria fora do banco para fechar o limite acima.",
      "Docker Compose com Postgres para subir tudo com um comando.",
      "Cancelamento com lances e estorno automático do saldo comprometido.",
      "Observabilidade: logs estruturados e métricas de latência do lance.",
    ],
  },
  tour: {
    title: "Roteiro de avaliação em 5 minutos",
    intro: "Os dados de demonstração já estão no banco. As contas de teste estão no README.",
    steps: [
      { title: "Veja um lote ao vivo", text: "Abra a vitrine sem login e entre em um lote com lances.", path: "/lots?tab=live", cta: "Abrir a vitrine" },
      { title: "Crie uma conta de licitante", text: "Leva meio minuto. Em seguida, deposite um valor na carteira.", path: "/signup", cta: "Criar conta" },
      { title: "Dispute em duas janelas", text: "Abra o mesmo lote numa janela anônima com outra conta e dê lances alternados: o aviso de superado aparece sem recarregar.", path: "/lots?tab=live", cta: "Ir aos lotes" },
      { title: "Audite um lote encerrado", text: "Sem login, abra a auditoria de um lote vendido e confira o selo e o comprovante.", path: "/lots?tab=ended", cta: "Lotes encerrados" },
      { title: "Entre como leiloeira", text: "Busque uma carta na Scryfall, defina preço e horários e publique o lote.", path: "/login", cta: "Entrar" },
    ],
  },
  ai: {
    title: "Uso de IA",
    intro:
      "O setup foi feito à mão: banco PostgreSQL no Neon, projeto Next.js e as integrações (Better Auth, Prisma, Cloudflare Turnstile e a API da Scryfall). Depois usei IA para a implementação, aplicando técnicas que aprendi na pós-graduação e em projetos profissionais. Nem tudo o que eu queria coube no prazo; o que ficou de fora está em Limitações conhecidas.",
    organizedTitle: "Como o trabalho foi organizado",
    organized: [
      { title: "Requisitos do sistema", text: "O ponto de partida: o que a plataforma precisa fazer, regra por regra." },
      { title: "Plano de ação", ref: "docs/plano-de-acao/", text: "Produto, regras de negócio com cenários de aceite, modelo de dados, decisões de segurança e a ordem das fases." },
      { title: "Design das telas", ref: "docs/design/", text: "As telas desenhadas antes do código." },
      {
        title: "Roteiro de desenvolvimento",
        ref: "docs/etapas-de-desenvolvimento/",
        text: "O plano de ação mapeado em etapas pequenas (F0 a F12), cada uma com checklist, critério de “pronto” e diário. Detalhei o que é delicado (lances, saldo, auditoria) sem poluir o resto.",
        note: {
          title: "Por que etapas pequenas",
          text: "Economizar créditos de IA. Cada pedido cobria um passo, e a IA lia só o arquivo daquela etapa, não o projeto inteiro. O checklist e o diário também permitem retomar exatamente de onde parou.",
        },
      },
      {
        title: "Execução",
        text: "A partir desses documentos, executei todas as etapas com a IA até o fim: schema e migrations, serviços de domínio, rotas, frontend, seed, testes, documentação e o vídeo de apresentação. A IA também rodou os comandos: migrations, seed, typecheck, lint e testes.",
      },
    ],
    conductedTitle: "Como a IA foi conduzida",
    conducted: [
      { title: "Um passo por pedido, com o documento da etapa como especificação", text: "O “Pronto quando” de cada etapa virou um teste executado de verdade: scripts de cenários contra o banco nas etapas F4 a F8 e Playwright a partir da F10." },
      { title: "Regras puras separadas dos casos de uso", text: "rules.ts e service.ts. Isso permitiu conferir prorrogação, estado do lote, lance mínimo e cadeia de auditoria com tabelas de casos, inclusive nos limites." },
      { title: "Portões em toda etapa", text: "A etapa só era dada como concluída com typecheck, lint e o teste dela passando." },
      {
        title: "Revisão independente no fim",
        ref: "docs/auditoria-2026-10-26.md",
        text: "Três revisões só de leitura (regras de negócio, segurança e banco, interface e testes), com cada achado conferido no código antes de corrigir. Foram 28 achados: 23 corrigidos com teste de regressão e 5 mantidos com o motivo registrado.",
      },
      { title: "Conferido pessoalmente", text: "A ordem das checagens e dos locks do lance, a tabela de prorrogação, a auditoria contra adulteração por SQL direto e a privacidade das rotas públicas." },
    ],
    toolsTitle: "Ferramentas",
    toolsColumns: { tool: "Ferramenta", use: "Para que foi usada" },
    tools: [
      { name: "Claude Code (VS Code e terminal)", use: "Implementação das etapas, execução de comandos, revisões e documentação." },
      { name: "Skills do Claude Code", where: ".agents/skills/", use: "frontend-design e ui-ux-pro-max (interface e design system), vercel-react-best-practices (React e Next.js), improve-codebase-architecture (fronteiras de domínio). Versões travadas em skills-lock.json." },
      { name: "Skills do Remotion", where: ".claude/skills/", use: "12 skills oficiais (remotion-dev/skills) usadas para montar e renderizar o vídeo." },
      { name: "Documentação local do Next.js", use: "O Next.js 16 muda APIs e convenções; a IA consultou node_modules/next/dist/docs/ antes de escrever código (regra do AGENTS.md)." },
      { name: "Playwright", use: "27 testes ponta a ponta com servidor e banco próprios, relógio controlável e Scryfall simulada; também gravou as telas do vídeo." },
      { name: "tsx", use: "Scripts de cenários das regras contra o banco (etapas F4 a F8) e a checagem de paridade das traduções." },
      { name: "TypeScript estrito e ESLint", use: "Inclui as regras do React Compiler; rodam em npm run check." },
    ],
    videoTitle: "Vídeo de apresentação",
    videoIntro: "O vídeo usa as telas reais do sistema, sem narração e sem trilha. O código fica na pasta video/.",
    video: [
      { title: "Gravação", text: "Um roteiro do Playwright usa o app no servidor e no banco de teste. Os quadros são capturados pelo screencast do Chrome DevTools Protocol, em alta qualidade, com um registro de cada movimento, clique, tecla e rolagem." },
      {
        title: "Montagem",
        text: "Remotion (vídeo escrito em React).",
        sub: [
          "Cada cena fica numa moldura de navegador ou de celular, com cursor e efeito de clique desenhados a partir do registro, aproximações nos momentos importantes e legendas em português.",
          "As esperas do servidor de desenvolvimento são cortadas automaticamente.",
        ],
      },
      { title: "Som", text: "Só cliques e teclas sutis, sintetizados por um script do próprio projeto." },
      { title: "Codificação", text: "O ffmpeg que vem com o Remotion gera o MP4 (1920×1080, 30 fps). O npm run publish cria a versão para a web usada nesta página." },
    ],
    more: "O mesmo conteúdo está na seção “Uso de IA” do README.",
  },
}

const en: PresentationContent = {
  meta: {
    title: "Overview · CardRush",
    description: "What CardRush is, how it was built and the technical decisions behind each requirement.",
  },
  hero: {
    eyebrow: "Project overview",
    title: "A live auction house where anyone can prove the bids were not tampered with",
    lead:
      "CardRush auctions Magic: The Gathering cards from the public Scryfall API. Auctioneers create lots, bidders compete in real time with a simulated balance, and the public audit detects any change to the history, even one made directly in the database. This page summarizes what was delivered, how and why.",
    ctaLots: "See live auctions",
    ctaTour: "Review guide",
  },
  video: {
    title: "The system in 3 minutes",
    hint: "Real screens recorded from the app itself. No voice-over: captions explain each step (in Portuguese).",
    fallback: "Your browser cannot play MP4 video.",
    download: "Download the video (MP4)",
    chapters: [
      { time: "0:04", label: "Showcase and search" },
      { time: "0:24", label: "Sign-up and deposit" },
      { time: "0:46", label: "Real-time bidding (two browsers)" },
      { time: "1:08", label: "Closing and receipt" },
      { time: "1:25", label: "My bids and statement" },
      { time: "1:35", label: "Audit detecting tampering" },
      { time: "1:56", label: "Auctioneer dashboard" },
      { time: "2:23", label: "Dark theme and English" },
      { time: "2:35", label: "Mobile" },
    ],
  },
  numbers: [
    { value: "9", label: "isolated business domains" },
    { value: "27", label: "end-to-end tests (Playwright)" },
    { value: "7", label: "versioned migrations" },
    { value: "422", label: "translated strings (pt and en)" },
    { value: "0", label: "personal data on public routes" },
    { value: "28", label: "internal review findings, 23 fixed" },
  ],
  context: {
    title: "The problem",
    paragraphs: [
      "An online auction house where an auctioneer lists items and bidders compete for each lot with live bids. Items come from a public API; here, collectible cards from Scryfall.",
      "The auctioneer builds a lot from an item found in the API, with a starting bid, minimum increment, start and end. The bidder deposits a simulated balance, follows live lots, bids and, when winning, gets a receipt that can be shared by link. Anyone, even without logging in, can audit a lot's history and check that it was not tampered with.",
    ],
    roles: [
      { name: "Auctioneer", text: "Creates and manages their own lots. Cannot bid." },
      { name: "Bidder", text: "Deposits balance, bids and wins items." },
      { name: "Visitor", text: "Browses the showcase, watches rooms and audits any lot without an account." },
    ],
  },
  requirements: {
    title: "Requirements and where each one is solved",
    intro: "Each row points to the mechanism behind it. Partial or missing items are marked as such.",
    status: { done: "Done", partial: "Partial", todo: "Not done" },
    columns: { need: "Requirement", how: "How it is met" },
    groups: [
      {
        name: "Interface",
        items: [
          { need: "Lot showcase", how: "Live, Scheduled and Ended tabs, with pagination and server-side search by name or set. Cancelled lots are hidden.", status: "done" },
          { need: "Auctioneer dashboard", how: "Scryfall search, new-lot wizard (card → price and times → review), cancellation without bids, the result of each lot and total received.", status: "done" },
          { need: "Live lot room", how: "Current bid, history, your position, a countdown corrected by the server clock and a “You're winning” / “You've been outbid” notice, without reloading.", status: "done" },
          { need: "Bidder wallet", how: "Total, committed and available balance, simulated deposit with an idempotency key, and a statement.", status: "done" },
          { need: "My bids", how: "Lots you bid on and lots you won, with receipt and share link.", status: "done" },
          { need: "Audit page", how: "Public, no login: full history and an Intact or Tampered seal pointing to the record where the chain breaks.", status: "done" },
          { need: "Feedback messages", how: "Each rejection has a stable code (below minimum, insufficient balance, already winning, not started, ended…) translated in the UI, with the missing amount where relevant.", status: "done" },
        ],
      },
      {
        name: "Business rules",
        items: [
          { need: "Unreliable external API", how: "Each lot stores a copy of the card. Showcase, rooms, audit and receipt keep working with Scryfall down; only the auctioneer's search warns and offers recently seen cards.", status: "done" },
          { need: "Bid rules", how: "Only on live lots; first bid ≥ starting bid; next ones ≥ current + increment; the leader cannot outbid themselves.", status: "done" },
          { need: "Committed balance", how: "Available = total − committed, never stored. When outbid, the amount is released in the same transaction. A database CHECK prevents negative balances.", status: "done" },
          { need: "Extension (anti-sniping)", how: "A bid with 2 min or less remaining adds 2 min to the current end, capped at 10 min per lot.", status: "done" },
          { need: "Settlement", how: "Closes each lot once, under a lock: debits the winner, credits the auctioneer and issues the receipt. Without bids it closes with no winner.", status: "done" },
          { need: "Tamper-evident history", how: "HMAC-SHA256 chain with a key outside the database, anchored on the lot and the receipt, and verified on every access.", status: "done" },
          { need: "Privacy", how: "Bidders appear only as a 4-character pseudonym, different for each lot. Never name, email or id.", status: "done" },
        ],
      },
      {
        name: "Delivery",
        items: [
          { need: "React + Node + PostgreSQL", how: "Next.js 16 with React 19, Node API routes, Prisma and PostgreSQL.", status: "done" },
          { need: "Test data", how: "Idempotent seed: one auctioneer, two funded bidders and lots that are live with bids, scheduled, sold and unsold.", status: "done" },
          { need: "Detailed README", how: "Step by step, every .env variable explained, decisions, tampering recipes and known limitations.", status: "done" },
        ],
      },
      {
        name: "Optional",
        items: [
          { need: "Lot search and filter", how: "Search in the top bar and the showcase, filtered on the server, plus tabs by state.", status: "done" },
          { need: "Cancellation with refund", how: "The owner can cancel while there are no bids; at that point there is no committed balance to refund. Cancelling a lot with bids is out of scope.", status: "partial" },
          { need: "Automated tests", how: "27 end-to-end Playwright tests, plus rule scenarios against the database and a translation parity check.", status: "done" },
          { need: "Dark mode", how: "System, Light or Dark, saved in the browser and applied before first paint (no flash).", status: "done" },
          { need: "Docker Compose", how: "Not included. The project uses a managed PostgreSQL (Neon); any local Postgres works.", status: "todo" },
        ],
      },
    ],
  },
  architecture: {
    title: "Architecture",
    intro: "A modular monolith: a single deploy with explicit domain boundaries. Rules do not depend on the framework and can be tested without a database.",
    layers: [
      { name: "Pages", path: "app/[lang]/", text: "Thin Server Components that only compose the screen. The language comes from the route." },
      { name: "Screens", path: "components/views/", text: "Client Components where there is real interaction: polling, countdown, anti-bot token." },
      { name: "HTTP API", path: "app/api/", text: "Input validation (Zod), authentication, permission and errors shaped as { code, message, data }." },
      { name: "Domains", path: "server/<domain>/", text: "rules.ts holds pure functions; service.ts holds use cases that receive the database or transaction as a parameter." },
      { name: "Core", path: "lib/", text: "Validated env, Prisma, injectable clock, money, errors and i18n." },
      { name: "Database", path: "prisma/", text: "Schema, migrations and the guarantees only SQL can express: partial unique index and CHECKs." },
    ],
    domainsTitle: "Domains",
    domains: [
      { name: "auth", text: "session and permissions as data" },
      { name: "security", text: "Turnstile and read pass" },
      { name: "catalog", text: "Scryfall client with queue and cache" },
      { name: "lots", text: "creation, derived state, cancellation" },
      { name: "payments", text: "wallet, deposit and statement" },
      { name: "bidding", text: "bids, committed balance, extension" },
      { name: "settlement", text: "settlement and receipt" },
      { name: "audit", text: "HMAC chain and pseudonyms" },
      { name: "realtime", text: "real-time contract (polling)" },
    ],
    rule: "A domain only uses another through its index.ts. Every business rule has an ID (BR-…) in lib/rules.ts, cited by the code that applies it.",
  },
  decisions: {
    title: "Technical decisions",
    intro: "Each relevant choice was recorded with its reason and cost. These are the ones that most shape the system's behaviour.",
    labels: { decision: "Decision", why: "Why", tradeoff: "Accepted cost" },
    items: [
      {
        title: "Money in integer cents",
        decision: "Every amount is an int in cents (*Cents). Available balance is computed, never stored.",
        why: "Floating point loses cents; a stored derived field can drift from its source.",
        tradeoff: "Ceiling of R$ 10 million per bid and R$ 20 million per wallet with int4.",
      },
      {
        title: "One transaction per bid, locks in a fixed order",
        decision: "SELECT … FOR UPDATE on the lot and wallets, always in ascending id order, in bidding, cancellation and settlement.",
        why: "Prevents double bids, double-committed balance and deadlocks between concurrent operations.",
        tradeoff: "Bids on the same lot are serialized. For an auction, that is the correct behaviour.",
      },
      {
        title: "Lot state derived from time",
        decision: "No status column: cancelled → closed → scheduled → live, computed from the server clock.",
        why: "No job can “forget” to flip a status; a bid after the end is rejected immediately, even before settlement runs.",
        tradeoff: "Showcase queries filter by dates, hence the indexes on startsAt and endsAt.",
      },
      {
        title: "Real time through polling behind an interface",
        decision: "Room every 2 s signed in and 5 s as a visitor, showcase every 10 s, paused on hidden tabs and refreshed right after a bid.",
        why: "Works on any host, serverless included, with no persistent connection to maintain.",
        tradeoff: "Up to 2 s of delay. Switching to SSE or WebSocket only changes the realtime module and the browser hook.",
      },
      {
        title: "Item copied into the lot",
        decision: "When a lot is created, the card's image, title and attributes are copied into the database.",
        why: "The external API can go down or change; the auction and the receipt cannot depend on it.",
        tradeoff: "Later fixes on Scryfall do not reach existing lots, which is desirable for a sales record.",
      },
      {
        title: "Permissions as data",
        decision: "Role, Permission and RolePermission in the database; code checks permissions (lot.create, bid.place), never role names.",
        why: "New roles, such as a moderator, can be added without touching rule code.",
        tradeoff: "One extra query per session, resolved once on load.",
      },
      {
        title: "Injectable clock",
        decision: "Every time read goes through lib/clock.ts. In test mode the clock is driven by a route that only exists in that mode.",
        why: "Extension and closing are tested end to end without waiting real minutes.",
        tradeoff: "Discipline: calling Date.now() directly in business rules is forbidden.",
      },
      {
        title: "Idempotent settlement with two triggers",
        decision: "The same function closes lots from an in-process sweep or from a cron route protected by a secret.",
        why: "A long-running server or serverless share the same rule; running it twice never closes twice.",
        tradeoff: "With cron, closing may lag up to 1 min, but bids after the end are already rejected by the clock.",
      },
    ],
  },
  bidding: {
    title: "The path of a bid",
    intro: "The order of checks is fixed and documented, so the same situation always produces the same answer.",
    steps: [
      "Validates the amount (format and limit) and the bid.place permission; an auctioneer gets BID_AUCTIONEER_NOT_ALLOWED.",
      "Opens the transaction and locks the lot and the involved wallets in ascending id order.",
      "A retry with the same idempotency key returns the original bid without writing another.",
      "Rejects if the lot was cancelled, has not started or has ended (by the server clock).",
      "Rejects if the bidder is already winning or the amount is below the minimum.",
      "Rejects if the amount does not fit the available balance, stating how much is missing.",
      "Stores the bid, commits the new leader's balance and releases the previous one in the same transaction.",
      "Extends the end if 2 min or less were left and appends the facts to the audit chain, still under the lock.",
    ],
    note: "Two equal bids at the same instant: one is accepted and the other gets the new minimum. This scenario is tested.",
  },
  audit: {
    title: "Tamper-evident audit",
    intro: "Every fact of a lot (bid, extension, cancellation and closing) is appended to a hash chain, in the same transaction that produced it.",
    points: [
      "The HMAC key (AUDIT_SECRET) lives outside the database: someone with database access alone cannot compute valid hashes.",
      "Canonical JSON (sorted keys) makes the hash independent of key order in jsonb.",
      "Anchors outside the chain: the last hash is stored on the lot and the receipt, and verification also checks the leader, current bid, current end and the bids table.",
      "Verification is redone on every access, in a RepeatableRead snapshot, and never cached.",
      "Changing an amount, author or time, inserting or removing a record turns the seal to Tampered and shows where. The video shows a direct database UPDATE being detected.",
    ],
    limits:
      "Accepted limit: whoever holds both the key and the database can rebuild the whole chain. Closing that gap would mean publishing the anchors somewhere external (append-only log or timestamping).",
  },
  security: {
    title: "Security",
    items: [
      { title: "Production lock", text: "The app refuses to start in production with default secrets, reused keys, test mode on, anti-bot off or a non-https URL." },
      { title: "Invisible anti-bot", text: "Cloudflare Turnstile is verified server-side on every write. Reads use a signed 4-minute pass checked in the proxy without calling Cloudflare. Fails closed." },
      { title: "Role escalation blocked", text: "Better Auth routes that could change the role are disabled, and a hook drops roleId from any update. There is a test for it." },
      { title: "Rate limiting", text: "Login is limited to 10 attempts per minute per IP." },
      { title: "Headers", text: "CSP with frame-ancestors 'none' against clickjacking on the bid button, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy and HSTS." },
      { title: "Separate secrets", text: "Different keys for session, audit, pseudonyms, read pass and cron: leaking one does not compromise the others." },
    ],
  },
  quality: {
    title: "Quality and tests",
    intro: "Tests cover what a user does, with two real browsers when the subject is real time.",
    items: [
      { title: "End to end (Playwright)", text: "Sign-up, deposit, rejected and accepted bids, real time across two browsers, extension, closing, receipt, SQL tampering, Scryfall outage, anti-bot, permissions, mobile, theme and languages." },
      { title: "Isolated environment", text: "Dedicated test database, server on another port and folder, controllable clock and simulated external API modes (down, rate limited, no image)." },
      { title: "Pure rules", text: "Extension, lot state, minimum bid and audit chain were checked with case tables, including the edges (2:00 extends, 2:00.001 does not)." },
      { title: "Independent review", text: "Three read-only reviews (rules, security and database, UI and tests). Of 28 findings, 23 were fixed with a regression test and 5 kept with a recorded reason." },
    ],
    commandsTitle: "Gates before every delivery",
    commands: [
      { cmd: "npm run check", text: "Strict TypeScript, lint (including React Compiler rules) and translation parity" },
      { cmd: "npm run test:e2e", text: "Playwright suite on its own server and database" },
      { cmd: "npm run build", text: "Production build with Cache Components" },
    ],
  },
  ux: {
    title: "Experience",
    items: [
      { title: "Mobile first", text: "On phones the navigation becomes a tab bar, the bid form docks above it, confirmations become bottom sheets and every touch target is at least 44 px." },
      { title: "Accessibility", text: "Focus trapped in modals and restored on close, labels on every control, reduced motion respected and contrast checked in both themes." },
      { title: "Portuguese and English", text: "Language in the route (/pt, /en), chosen by cookie or browser, with currency and dates in each locale's format." },
      { title: "Errors that explain", text: "The API returns stable codes; the UI says why and what to do, such as the minimum bid or how much balance is missing." },
    ],
  },
  ops: {
    title: "Operations",
    items: [
      { title: "Validated configuration", text: "Variables are read once and validated with Zod at startup; a wrong one stops the process with the exact message." },
      { title: "Two ways to host", text: "A long-running Node server with the settlement sweep in-process, or serverless with an external cron calling the protected route." },
      { title: "Reviewed migrations", text: "A direct connection for migrations (no pooler) and SQL guarantees (partial index, CHECKs) reviewed on every generated migration." },
      { title: "Health check", text: "/api/health route for the host's monitor." },
    ],
  },
  limits: {
    title: "Known limitations",
    items: [
      "Polling, not push: changes arrive within 2 s signed in and 5 s as a visitor.",
      "No withdrawals, fees or cancelling a lot that already has bids.",
      "Sign-up does not confirm the email.",
      "Whoever has both the audit key and the database can rebuild the chain.",
      "No Docker Compose; the project expects an existing PostgreSQL.",
    ],
    nextTitle: "Next steps",
    next: [
      "Replace polling with SSE where the host allows long-lived connections.",
      "Publish audit anchors outside the database to close the limit above.",
      "Docker Compose with Postgres to start everything with one command.",
      "Cancellation with bids and automatic refund of committed balance.",
      "Observability: structured logs and bid latency metrics.",
    ],
  },
  tour: {
    title: "5-minute review guide",
    intro: "Demo data is already in the database. Test accounts are listed in the README.",
    steps: [
      { title: "Open a live lot", text: "Browse the showcase without logging in and open a lot with bids.", path: "/lots?tab=live", cta: "Open the showcase" },
      { title: "Create a bidder account", text: "It takes half a minute. Then deposit an amount into the wallet.", path: "/signup", cta: "Sign up" },
      { title: "Compete in two windows", text: "Open the same lot in a private window with another account and alternate bids: the outbid notice appears without reloading.", path: "/lots?tab=live", cta: "Go to lots" },
      { title: "Audit an ended lot", text: "Without logging in, open the audit of a sold lot and check the seal and the receipt.", path: "/lots?tab=ended", cta: "Ended lots" },
      { title: "Sign in as the auctioneer", text: "Search a card on Scryfall, set price and times and publish the lot.", path: "/login", cta: "Sign in" },
    ],
  },
  ai: {
    title: "Use of AI",
    intro:
      "The setup was done by hand: PostgreSQL database on Neon, the Next.js project and the integrations (Better Auth, Prisma, Cloudflare Turnstile and the Scryfall API). Then I used AI for the implementation, applying techniques learned in graduate school and in professional projects. Not everything I wanted fit in the time available; what was left out is under Known limitations.",
    organizedTitle: "How the work was organized",
    organized: [
      { title: "System requirements", text: "The starting point: what the platform must do, rule by rule." },
      { title: "Action plan", ref: "docs/plano-de-acao/", text: "Product, business rules with acceptance scenarios, data model, security decisions and the order of phases." },
      { title: "Screen design", ref: "docs/design/", text: "Screens designed before any code." },
      {
        title: "Development roadmap",
        ref: "docs/etapas-de-desenvolvimento/",
        text: "The action plan mapped into small stages (F0 to F12), each with a checklist, a definition of “done” and a log. The delicate parts (bids, balance, audit) are detailed without cluttering the rest.",
        note: {
          title: "Why small stages",
          text: "To save AI credits. Each request covered one step, and the AI read only that stage's file, not the whole project. The checklist and log also make it possible to resume exactly where work stopped.",
        },
      },
      {
        title: "Execution",
        text: "From these documents, I ran every stage with AI to the end: schema and migrations, domain services, routes, frontend, seed, tests, documentation and the presentation video. The AI also ran the commands: migrations, seed, typecheck, lint and tests.",
      },
    ],
    conductedTitle: "How the AI was guided",
    conducted: [
      { title: "One step per request, with the stage document as the specification", text: "Each stage's “Done when” became a test that actually ran: scenario scripts against the database in stages F4 to F8 and Playwright from F10 on." },
      { title: "Pure rules separated from use cases", text: "rules.ts and service.ts. This made it possible to check extension, lot state, minimum bid and the audit chain with case tables, edges included." },
      { title: "Gates on every stage", text: "A stage was only done when typecheck, lint and its own test passed." },
      {
        title: "Independent review at the end",
        ref: "docs/auditoria-2026-10-26.md",
        text: "Three read-only reviews (business rules, security and database, UI and tests), with each finding checked in the code before fixing. 28 findings: 23 fixed with a regression test and 5 kept with a recorded reason.",
      },
      { title: "Personally checked", text: "The order of bid checks and locks, the extension table, the audit against direct SQL tampering and the privacy of public routes." },
    ],
    toolsTitle: "Tools",
    toolsColumns: { tool: "Tool", use: "What it was used for" },
    tools: [
      { name: "Claude Code (VS Code and terminal)", use: "Implementing the stages, running commands, reviews and documentation." },
      { name: "Claude Code skills", where: ".agents/skills/", use: "frontend-design and ui-ux-pro-max (interface and design system), vercel-react-best-practices (React and Next.js), improve-codebase-architecture (domain boundaries). Versions pinned in skills-lock.json." },
      { name: "Remotion skills", where: ".claude/skills/", use: "12 official skills (remotion-dev/skills) used to edit and render the video." },
      { name: "Local Next.js docs", use: "Next.js 16 changes APIs and conventions; the AI read node_modules/next/dist/docs/ before writing code (rule in AGENTS.md)." },
      { name: "Playwright", use: "27 end-to-end tests with their own server and database, controllable clock and simulated Scryfall; it also recorded the video's screens." },
      { name: "tsx", use: "Rule scenario scripts against the database (stages F4 to F8) and the translation parity check." },
      { name: "Strict TypeScript and ESLint", use: "Includes the React Compiler rules; run by npm run check." },
    ],
    videoTitle: "Presentation video",
    videoIntro: "The video uses the system's real screens, with no voice-over and no music. Its code lives in the video/ folder.",
    video: [
      { title: "Recording", text: "A Playwright script drives the app on the test server and database. Frames are captured by the Chrome DevTools Protocol screencast, in high quality, with a log of every move, click, key and scroll." },
      {
        title: "Editing",
        text: "Remotion (video written in React).",
        sub: [
          "Each scene sits in a browser or phone frame, with cursor and click effect drawn from the log, zooms on key moments and Portuguese captions.",
          "Development server waits are cut automatically.",
        ],
      },
      { title: "Sound", text: "Only subtle clicks and keystrokes, synthesized by a script in the project." },
      { title: "Encoding", text: "The ffmpeg bundled with Remotion produces the MP4 (1920×1080, 30 fps). npm run publish creates the web version used on this page." },
    ],
    more: "The same content is in the “Uso de IA” section of the README.",
  },
}

export const PRESENTATION: Record<Locale, PresentationContent> = { pt, en }
