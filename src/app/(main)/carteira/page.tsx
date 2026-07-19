import { PackageOpen } from "lucide-react"

import { AddAssetButton } from "@/features/portfolio/components/AddAssetButton"
import { PortfolioSummaryCards } from "@/features/portfolio/components/PortfolioSummaryCards"
import { PositionsTable } from "@/features/portfolio/components/PositionsTable"
import { getPortfolioSummary } from "@/features/portfolio/queries"
import { requireUser } from "@/lib/auth/session"

export default async function CarteiraPage() {
  const profile = await requireUser()
  const { positions, totals } = await getPortfolioSummary(profile.id)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Carteira</h1>
          <p className="text-muted-foreground">
            Acompanhe suas posições, compras, vendas e proventos.
          </p>
        </div>
        <AddAssetButton />
      </div>

      {positions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border py-20 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <PackageOpen className="size-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-medium">Sua carteira está vazia</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Adicione seu primeiro ativo — informe só a data e a quantidade, o preço é preenchido
              automaticamente a partir do fechamento histórico.
            </p>
          </div>
          <AddAssetButton />
        </div>
      ) : (
        <>
          <PortfolioSummaryCards totals={totals} />
          <PositionsTable positions={positions} />
        </>
      )}
    </div>
  )
}
