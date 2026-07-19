import { PackageOpen } from "lucide-react"

import { AddInvestmentButton } from "@/features/portfolio/components/AddInvestmentButton"
import { PortfolioBoard } from "@/features/portfolio/components/PortfolioBoard"
import { PortfolioSummaryCards } from "@/features/portfolio/components/PortfolioSummaryCards"
import { getPortfolioSummary } from "@/features/portfolio/queries"
import { requireUser } from "@/lib/auth/session"

export default async function CarteiraPage() {
  const profile = await requireUser()
  const { positions, totals, byCategory } = await getPortfolioSummary(profile.id)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Carteira</h1>
          <p className="text-muted-foreground">
            Acompanhe suas posições, compras, vendas e proventos.
          </p>
        </div>
        <AddInvestmentButton />
      </div>

      {positions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border py-20 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <PackageOpen className="size-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-medium">Sua carteira está vazia</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Adicione seu primeiro investimento — escolha a categoria, informe a data e a
              quantidade, o preço é preenchido automaticamente quando possível.
            </p>
          </div>
          <AddInvestmentButton />
        </div>
      ) : (
        <>
          <PortfolioSummaryCards totals={totals} />
          <PortfolioBoard byCategory={byCategory} />
        </>
      )}
    </div>
  )
}
