import { PriceChangeTag } from "@/components/shared/PriceChangeTag"
import { IndicatorBadge } from "@/features/company/components/metrics/IndicatorBadge"
import type { CompanyMetricsSource } from "@/features/company/indicators"
import { cn } from "@/lib/utils"
import { formatCurrencyCents } from "@/utils/format"

const DEFAULT_KEYS = ["priceToEarnings", "dividendYield", "roe"]

interface CompanyQuickStatsProps {
  dto: CompanyMetricsSource
  /// Indicator keys to show as compact badges — defaults to the exact
  /// "PETR4 — P/L 4.2, DY 14%, ROE 32%" pattern. Badges with no data for
  /// this asset class/company just don't render (see IndicatorBadge).
  keys?: string[]
  showPrice?: boolean
  className?: string
}

/// Preset compact row for Radar/Notícias/Busca/Alertas — a company's
/// price+variação plus 2-4 fundamental badges, small enough to sit under a
/// headline or beside a ticker without competing with it visually. Every
/// value goes through the same indicators.ts registry as the rest of the
/// app; nothing here is a second computation. `dto.priceCents`/
/// `priceChangePct` are optional on CompanyMetricsSource (not every caller
/// has them), so `showPrice` only actually renders when both are present.
export function CompanyQuickStats({ dto, keys = DEFAULT_KEYS, showPrice = true, className }: CompanyQuickStatsProps) {
  const canShowPrice = showPrice && dto.priceCents != null && dto.priceChangePct != null

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {canShowPrice && (
        <>
          <span className="text-xs font-semibold tabular-nums">{formatCurrencyCents(dto.priceCents!)}</span>
          <PriceChangeTag changePct={dto.priceChangePct!} className="text-xs" />
        </>
      )}
      {keys.map((key) => (
        <IndicatorBadge key={key} dto={dto} indicatorKey={key} />
      ))}
    </div>
  )
}
