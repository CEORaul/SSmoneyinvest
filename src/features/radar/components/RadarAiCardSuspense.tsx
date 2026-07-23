import { Suspense } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { RadarAiCard } from "@/features/radar/components/RadarAiCard"

interface RadarAiCardSuspenseProps {
  profileId: string
}

/// Scoped tightly to the AI call (the one genuinely slow, externally-billed
/// part of the page) so a slow/failed generation never blocks the rest of
/// /radar's already-fetched real sections — same pattern as
/// CompanySummaryCard on /empresa/[ticker].
export function RadarAiCardSuspense({ profileId }: RadarAiCardSuspenseProps) {
  return (
    <Suspense fallback={<Skeleton className="h-28 w-full rounded-xl" />}>
      <RadarAiCard profileId={profileId} />
    </Suspense>
  )
}
