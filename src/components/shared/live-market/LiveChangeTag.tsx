"use client"

import { useLiveMarketPrice, type LiveMarketPriceInput } from "@/hooks/use-live-market-price"
import { PriceChangeTag } from "@/components/shared/PriceChangeTag"

interface LiveChangeTagProps extends LiveMarketPriceInput {
  className?: string
}

/// Drop-in replacement for a static <PriceChangeTag changePct={...} /> —
/// same rendering, silently kept fresh by the centralized live-refresh
/// store. A plain leaf Client Component (not a render-prop), so a Server
/// Component can render it directly.
export function LiveChangeTag({ className, ...input }: LiveChangeTagProps) {
  const live = useLiveMarketPrice(input)
  return <PriceChangeTag changePct={live.priceChangePct} className={className} />
}
