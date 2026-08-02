import Link from "next/link"
import { Flame, TrendingDown, TrendingUp, Wallet } from "lucide-react"
import type { ReactNode } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LiveChangeTag } from "@/components/shared/live-market/LiveChangeTag"
import { LivePriceText } from "@/components/shared/live-market/LivePriceText"
import { LiveVolumeText } from "@/components/shared/live-market/LiveVolumeText"
import { PriceChangeTag } from "@/components/shared/PriceChangeTag"
import { TickerBadge } from "@/components/shared/TickerBadge"
import { getPopularCompanies, getTopGainers, getTopLosers } from "@/features/market/queries"
import { getTopByVolume } from "@/features/search/queries"
import type { CompanyListItem } from "@/types"
import { formatCompactNumber, formatCurrencyCents } from "@/utils/format"

interface MoverColumn {
  title: string
  icon: ReactNode
  companies: CompanyListItem[]
}

function MoverRow({ company }: { company: CompanyListItem }) {
  const liveInput = company.id
    ? { id: company.id, priceCents: company.priceCents, priceChangePct: company.changePct, volume: company.volume }
    : null

  return (
    <Link
      href={`/empresa/${company.ticker}`}
      className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/50"
    >
      <TickerBadge ticker={company.ticker} logoUrl={company.logoUrl} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{company.ticker}</p>
        <p className="truncate text-xs text-muted-foreground">{company.name}</p>
      </div>
      {liveInput ? (
        <>
          <div className="flex flex-col items-end gap-0.5">
            <LivePriceText {...liveInput} className="text-sm font-medium tabular-nums" />
            <LiveChangeTag {...liveInput} />
          </div>
          <LiveVolumeText {...liveInput} className="w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground" />
        </>
      ) : (
        <>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-sm font-medium tabular-nums">{formatCurrencyCents(company.priceCents)}</span>
            <PriceChangeTag changePct={company.changePct} />
          </div>
          {company.volume != null && (
            <span className="w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {formatCompactNumber(company.volume)}
            </span>
          )}
        </>
      )}
    </Link>
  )
}

/// Mercado 2.0's "Maiores Movimentos" — four genuinely distinct real
/// signals (never the same ranking relabeled twice): maiores altas/baixas
/// by price change, "mais negociadas" from the platform's own SearchLog-
/// based trending (getPopularCompanies), and "maior volume" from real
/// trading volume (getTopByVolume). Each row shows Ticker/Nome/Preço/
/// Variação/Volume and links straight to /empresa/[ticker].
export async function MarketMoversGrid() {
  const [gainers, losers, popular, byVolume] = await Promise.all([
    getTopGainers(5),
    getTopLosers(5),
    getPopularCompanies(5),
    getTopByVolume(5),
  ])

  const columns: MoverColumn[] = [
    { title: "Maiores Altas", icon: <TrendingUp className="size-4 text-gain" />, companies: gainers },
    { title: "Maiores Baixas", icon: <TrendingDown className="size-4 text-loss" />, companies: losers },
    { title: "Mais Negociadas", icon: <Flame className="size-4 text-primary" />, companies: popular },
    { title: "Maior Volume", icon: <Wallet className="size-4 text-primary" />, companies: byVolume },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {columns.map((column) => (
        <Card key={column.title}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              {column.icon}
              {column.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0.5">
            {column.companies.length > 0 ? (
              column.companies.map((company) => <MoverRow key={company.ticker} company={company} />)
            ) : (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">Sem dados suficientes ainda.</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
