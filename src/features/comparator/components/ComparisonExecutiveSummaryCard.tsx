import { Suspense } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import type { CompanyDetailDTO } from "@/features/company/queries"
import { ComparisonExecutiveSummary } from "@/features/comparator/components/ComparisonExecutiveSummary"

interface ComparisonExecutiveSummaryCardProps {
  companies: CompanyDetailDTO[]
}

/// Scoped Suspense boundary around the one genuinely slow, externally-
/// billed part of /comparar — mirrors CompanySummaryCard's exact reasoning,
/// so the chart/table (already-fetched real data) never wait on it.
export function ComparisonExecutiveSummaryCard({ companies }: ComparisonExecutiveSummaryCardProps) {
  return (
    <Suspense fallback={<Skeleton className="h-28 w-full rounded-xl" />}>
      <ComparisonExecutiveSummary companies={companies} />
    </Suspense>
  )
}
