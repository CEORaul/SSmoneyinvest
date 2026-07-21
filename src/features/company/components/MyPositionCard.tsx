"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { IncomeDialog } from "@/features/portfolio/components/IncomeDialog"
import { TradeDialog, type TradeCompany } from "@/features/portfolio/components/TradeDialog"
import type { PositionSummaryDTO } from "@/features/company/queries"
import { cn } from "@/lib/utils"
import { formatCurrencyCents, formatPercent } from "@/utils/format"

interface MyPositionCardProps {
  company: TradeCompany
  position: PositionSummaryDTO
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "gain" | "loss" }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-sm font-semibold tabular-nums",
          tone === "gain" && "text-gain",
          tone === "loss" && "text-loss"
        )}
      >
        {value}
      </span>
    </div>
  )
}

export function MyPositionCard({ company, position }: MyPositionCardProps) {
  const [action, setAction] = useState<"buy" | "sell" | "income" | null>(null)
  const isProfit = position.profitCents >= 0

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Minha Posição</CardTitle>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setAction("buy")}>
            Adicionar Compra
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAction("sell")}>
            Adicionar Venda
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Quantidade" value={position.quantity} />
        <Stat label="Preço Médio" value={formatCurrencyCents(position.averagePriceCents)} />
        <Stat label="Preço Atual" value={formatCurrencyCents(position.currentPriceCents)} />
        <Stat label="Valor Investido" value={formatCurrencyCents(position.investedCents)} />
        <Stat label="Valor Atual" value={formatCurrencyCents(position.currentValueCents)} />
        <Stat
          label="Lucro"
          value={formatCurrencyCents(position.profitCents)}
          tone={isProfit ? "gain" : "loss"}
        />
        <Stat
          label="Rentabilidade"
          value={formatPercent(position.profitPct)}
          tone={isProfit ? "gain" : "loss"}
        />
        <Stat label="Dividendos Recebidos" value={formatCurrencyCents(position.dividendsReceivedCents)} />
      </CardContent>

      <TradeDialog
        type="BUY"
        company={company}
        ownedQuantity={position.quantity}
        open={action === "buy"}
        onOpenChange={(open) => !open && setAction(null)}
      />
      <TradeDialog
        type="SELL"
        company={company}
        ownedQuantity={position.quantity}
        open={action === "sell"}
        onOpenChange={(open) => !open && setAction(null)}
      />
      <IncomeDialog
        companyId={company.id}
        ticker={company.ticker}
        open={action === "income"}
        onOpenChange={(open) => !open && setAction(null)}
      />
    </Card>
  )
}
