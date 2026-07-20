import { PackageOpen } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { PortfolioSummaryCards } from "@/features/portfolio/components/PortfolioSummaryCards"
import { getPortfolioSummary } from "@/features/portfolio/queries"

interface MyPortfolioSectionProps {
  profileId: string
}

/// Only rendered on Home for a logged-in visitor (see (marketing)/page.tsx)
/// — the personalized counterpart to the public MarketMoversSection below
/// it. Reuses the exact same query and summary-cards component as
/// /carteira, so the numbers here are never a second, possibly-drifting
/// implementation of the same math.
export async function MyPortfolioSection({ profileId }: MyPortfolioSectionProps) {
  const { positions, totals } = await getPortfolioSummary(profileId)
  const hasPositions = positions.length > 0

  return (
    <section className="px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Minha Carteira</h2>
            <p className="text-muted-foreground">
              {hasPositions
                ? "Acompanhe sua rentabilidade e patrimônio em tempo real."
                : "Comece a acompanhar seus investimentos agora mesmo."}
            </p>
          </div>
          <Button size="lg" nativeButton={false} render={<Link href="/carteira" />}>
            Minha Carteira
          </Button>
        </div>

        <div className="mt-6">
          {hasPositions ? (
            <PortfolioSummaryCards totals={totals} />
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                <PackageOpen className="size-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-medium">Você ainda não tem investimentos</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Adicione seu primeiro ativo e acompanhe preço médio, lucro e dividendos
                  automaticamente.
                </p>
              </div>
              <Button nativeButton={false} render={<Link href="/carteira" />}>
                Adicionar meu primeiro investimento
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
