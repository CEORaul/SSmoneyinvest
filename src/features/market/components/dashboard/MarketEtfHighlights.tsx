import Link from "next/link"
import { LineChart } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LiveChangeTag } from "@/components/shared/live-market/LiveChangeTag"
import { LivePriceText } from "@/components/shared/live-market/LivePriceText"
import { LiveVolumeText } from "@/components/shared/live-market/LiveVolumeText"
import { TickerBadge } from "@/components/shared/TickerBadge"
import { getEtfHighlights } from "@/features/market/dashboard-queries"
import { formatPercent } from "@/utils/format"

/// Mercado 2.0's "ETFs" — Preço/Variação/Volume/P-VP/DY, sourced from the
/// same searchMarketAssets the filter board runs (see dashboard-queries.ts's
/// getEtfHighlights). priceToBook/dividendYieldPct already arrived on every
/// row from that shared query — this component just wasn't rendering them
/// yet (a pure UI gap, not a missing fetch).
export async function MarketEtfHighlights() {
  const etfs = await getEtfHighlights(8)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LineChart className="size-4 text-primary" />
          ETFs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-0.5">
        {etfs.length > 0 ? (
          etfs.map((etf) => (
            <Link
              key={etf.id}
              href={`/empresa/${etf.ticker}`}
              className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/50"
            >
              <TickerBadge ticker={etf.ticker} logoUrl={etf.logoUrl} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{etf.ticker}</p>
                <p className="truncate text-xs text-muted-foreground">{etf.name}</p>
              </div>
              <div className="hidden flex-col items-end gap-0.5 text-xs text-muted-foreground sm:flex">
                {etf.priceToBook != null && <span>P/VP {etf.priceToBook.toFixed(2).replace(".", ",")}</span>}
                {etf.dividendYieldPct != null && etf.dividendYieldPct > 0 && (
                  <span>DY {formatPercent(etf.dividendYieldPct)}</span>
                )}
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <LivePriceText id={etf.id} priceCents={etf.priceCents} className="text-sm font-medium tabular-nums" />
                <LiveChangeTag id={etf.id} priceCents={etf.priceCents} priceChangePct={etf.priceChangePct} />
              </div>
              <LiveVolumeText
                id={etf.id}
                priceCents={etf.priceCents}
                volume={etf.volume}
                className="hidden w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground sm:block"
              />
            </Link>
          ))
        ) : (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">Sem dados suficientes ainda.</p>
        )}
      </CardContent>
    </Card>
  )
}
