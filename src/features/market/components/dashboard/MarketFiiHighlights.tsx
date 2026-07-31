import Link from "next/link"
import { Building2 } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TickerBadge } from "@/components/shared/TickerBadge"
import { getFiiHighlights } from "@/features/market/dashboard-queries"
import { formatCompactNumber, formatCurrencyCents } from "@/utils/format"

/// Mercado 2.0's "FIIs em Destaque" — Dividend Yield/Preço/P-VP/Liquidez per
/// the spec's own field list, sourced from the same searchMarketAssets the
/// filter board runs (see dashboard-queries.ts's getFiiHighlights).
export async function MarketFiiHighlights() {
  const fiis = await getFiiHighlights(8)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="size-4 text-primary" />
          FIIs em Destaque
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-0.5">
        {fiis.length > 0 ? (
          fiis.map((fii) => (
            <Link
              key={fii.id}
              href={`/empresa/${fii.ticker}`}
              className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/50"
            >
              <TickerBadge ticker={fii.ticker} logoUrl={fii.logoUrl} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{fii.ticker}</p>
                <p className="truncate text-xs text-muted-foreground">{fii.name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">DY</p>
                <p className="text-sm font-medium tabular-nums text-gain">
                  {(fii.dividendYieldPct ?? 0).toFixed(2).replace(".", ",")}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Preço</p>
                <p className="text-sm font-medium tabular-nums">{formatCurrencyCents(fii.priceCents)}</p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-xs text-muted-foreground">P/VP</p>
                <p className="text-sm font-medium tabular-nums">
                  {fii.priceToBook != null ? fii.priceToBook.toFixed(2).replace(".", ",") : "—"}
                </p>
              </div>
              <div className="hidden text-right md:block">
                <p className="text-xs text-muted-foreground">Liquidez</p>
                <p className="text-sm font-medium tabular-nums">
                  {fii.volume != null ? formatCompactNumber(fii.volume) : "—"}
                </p>
              </div>
            </Link>
          ))
        ) : (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">Sem dados suficientes ainda.</p>
        )}
      </CardContent>
    </Card>
  )
}
