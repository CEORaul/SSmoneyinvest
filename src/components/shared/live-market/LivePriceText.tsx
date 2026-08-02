"use client"

import { useLiveMarketPrice, type LiveMarketPriceInput } from "@/hooks/use-live-market-price"
import { formatCurrencyCents } from "@/utils/format"

interface LivePriceTextProps extends LiveMarketPriceInput {
  className?: string
}

/// Drop-in replacement for a static formatCurrencyCents(priceCents) text
/// node — renders the same string, silently kept fresh by the centralized
/// live-refresh store. A plain leaf Client Component (not a render-prop)
/// so a Server Component can render it directly: React Server Components
/// can pass serializable props across that boundary, never functions.
export function LivePriceText({ className, ...input }: LivePriceTextProps) {
  const live = useLiveMarketPrice(input)
  return <span className={className}>{formatCurrencyCents(live.priceCents)}</span>
}
