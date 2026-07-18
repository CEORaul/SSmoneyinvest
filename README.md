# SSmoney Invest

Plataforma de acompanhamento de investimentos (ações, FIIs e ETFs) — base sólida e escalável, inspirada em Investidor10, com um visual mais moderno (Stripe/Linear/Vercel).

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4 + shadcn/ui (preset Nova)
- Prisma 7 (`prisma-client` generator + `@prisma/adapter-pg`) sobre PostgreSQL (Supabase)
- Supabase Auth (`@supabase/ssr`)
- TanStack React Query
- Zod + React Hook Form
- Framer Motion (`motion`)
- Recharts
- Lucide Icons

## Arquitetura

```
src/
  app/           rotas (App Router) — grupos (auth) e (main)
  components/
    ui/          primitivos shadcn/ui
    shared/      componentes reutilizáveis entre features
    layout/      shell (sidebar, header, etc.)
  features/      um subdiretório por domínio (dashboard, market, stocks, fiis, etfs, favorites, portfolio, company, profile, settings, auth, home)
  services/      acesso a dados / integrações externas
  hooks/         hooks compartilhados
  lib/           prisma, supabase, motion, utils de infraestrutura
  types/         tipos compartilhados
  utils/         formatação e helpers puros
  proxy.ts       refresh de sessão Supabase (substitui o antigo middleware.ts no Next 16)
```

## Setup local

1. `npm install`
2. Copie `.env.example` para `.env` e preencha as credenciais do Supabase/Postgres.
3. `npx prisma migrate dev` para aplicar o schema.
4. `npm run dev`

## Banco de dados

Modelos Prisma em `prisma/schema.prisma`: `Profile`, `Company` (+ extensões `Stock`/`Fii`/`Etf`), `PriceHistoryPoint`, `DividendPayment`, `Favorite`, `PortfolioPosition`, `Transaction`.
