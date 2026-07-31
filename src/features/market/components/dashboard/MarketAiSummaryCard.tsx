import { Suspense } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { MarketAiSummaryCardInner } from "@/features/market/components/dashboard/MarketAiSummaryCardInner"

/// Scoped Suspense boundary around the one genuinely slow, externally-
/// billed part of Mercado 2.0 — same pattern as CompanySummaryCard.
export function MarketAiSummaryCard() {
  return (
    <Suspense fallback={<Skeleton className="h-28 w-full rounded-xl" />}>
      <MarketAiSummaryCardInner />
    </Suspense>
  )
}
