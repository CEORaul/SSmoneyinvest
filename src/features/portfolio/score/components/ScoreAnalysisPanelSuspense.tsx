import { Suspense } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { ScoreAnalysisPanel } from "@/features/portfolio/score/components/ScoreAnalysisPanel"

interface ScoreAnalysisPanelSuspenseProps {
  profileId: string
}

export function ScoreAnalysisPanelSuspense({ profileId }: ScoreAnalysisPanelSuspenseProps) {
  return (
    <Suspense fallback={<Skeleton className="h-40 w-full rounded-xl" />}>
      <ScoreAnalysisPanel profileId={profileId} />
    </Suspense>
  )
}
