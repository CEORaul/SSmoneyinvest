import type { AssetClass } from "@/generated/prisma/client"
import { FinancialMetricGrid } from "@/features/company/components/metrics/FinancialMetricGrid"
import type { CompanyMetricsSource } from "@/features/company/indicators"
import { cn } from "@/lib/utils"

const DEFAULT_KEYS: Record<AssetClass, string[]> = {
  STOCK: ["priceToEarnings", "priceToBook", "dividendYield", "roe"],
  BDR: ["priceToEarnings", "priceToBook", "dividendYield", "roe"],
  FII: ["priceToBook", "dividendYield"],
  ETF: ["dividendYield"],
  CRYPTO: [],
  FIXED_INCOME: [],
  OTHER: [],
}

interface FinancialHighlightsProps {
  dto: CompanyMetricsSource
  assetClass: AssetClass
  /// Overrides the per-asset-class default set above (e.g. the Comparador's
  /// quick-view might want a slightly larger set than a Mercado card).
  keys?: string[]
  className?: string
}

/// Card-styled mini-grid of 2-4 fundamentals — "P/L 8,45 / P/VP 1,18 /
/// DY 9,2% / ROE 24%" — for Mercado's stock/FII/ETF cards and any other
/// surface that wants a denser preview than the full Fundamentos grid but
/// more than a single-line badge row (see CompanyQuickStats for that).
/// Defaults per asset class so a FII card never shows a wall of "—" for
/// stock-only ratios it structurally can't have.
export function FinancialHighlights({ dto, assetClass, keys, className }: FinancialHighlightsProps) {
  const indicatorKeys = keys ?? DEFAULT_KEYS[assetClass]
  if (indicatorKeys.length === 0) return null

  return (
    <FinancialMetricGrid
      dto={dto}
      indicatorKeys={indicatorKeys}
      size="sm"
      className={cn("grid-cols-2 gap-1.5 sm:grid-cols-4", className)}
    />
  )
}
