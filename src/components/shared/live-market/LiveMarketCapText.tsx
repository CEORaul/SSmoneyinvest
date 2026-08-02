"use client"

import { useLiveMarketPrice, type LiveMarketPriceInput } from "@/hooks/use-live-market-price"
import { formatCurrencyCentsCompact } from "@/utils/format"

interface LiveMarketCapTextProps extends LiveMarketPriceInput {
  className?: string
  /// When set, renders "{label} {value}" together (CompanyHeader's "Market
  /// Cap R$ 558,2 bi" style) instead of a bare number.
  label?: string
  /// Shown instead of nothing when there's no market cap (ComparisonTable's
  /// "—" cell) — defaults to rendering nothing, matching every other Live*
  /// component's default behavior.
  fallback?: React.ReactNode
}

/// Drop-in replacement for a static formatCurrencyCentsCompact(marketCap)
/// text node — hidden (or shows `fallback`) when the live snapshot has no
/// market cap, evaluated against the live value, not the initial one.
export function LiveMarketCapText({ className, label, fallback = null, ...input }: LiveMarketCapTextProps) {
  const live = useLiveMarketPrice(input)
  if (live.marketCapCents == null) return <>{fallback}</>

  const formatted = formatCurrencyCentsCompact(live.marketCapCents)
  if (label) {
    return (
      <span className={className}>
        {label} <span className="font-medium text-foreground">{formatted}</span>
      </span>
    )
  }
  return <span className={className}>{formatted}</span>
}
