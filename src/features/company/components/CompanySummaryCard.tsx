import { Suspense } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import type { CompanyDetailDTO } from "@/features/company/queries"
import { AiSummaryCard } from "@/features/company/components/AiSummaryCard"

interface CompanySummaryCardProps {
  dto: CompanyDetailDTO
}

/// This app's first Suspense boundary — scoped tightly to the AI call
/// (the one genuinely slow, externally-billed part of the page) so a slow
/// or failed generation never blocks the header/chart/indicators/dividends,
/// all of which are already-fetched real data with nothing to wait on.
export function CompanySummaryCard({ dto }: CompanySummaryCardProps) {
  return (
    <Suspense fallback={<Skeleton className="h-28 w-full rounded-xl" />}>
      <AiSummaryCard dto={dto} />
    </Suspense>
  )
}
