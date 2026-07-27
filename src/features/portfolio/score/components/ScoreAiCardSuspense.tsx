import { Suspense } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { ScoreAiCard } from "@/features/portfolio/score/components/ScoreAiCard"

interface ScoreAiCardSuspenseProps {
  profileId: string
}

export function ScoreAiCardSuspense({ profileId }: ScoreAiCardSuspenseProps) {
  return (
    <Suspense fallback={<Skeleton className="h-14 w-full rounded-lg" />}>
      <ScoreAiCard profileId={profileId} />
    </Suspense>
  )
}
