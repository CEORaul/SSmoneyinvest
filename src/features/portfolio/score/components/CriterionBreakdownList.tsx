import { CriterionInfoPopover } from "@/features/portfolio/score/components/CriterionInfoPopover"
import type { CriterionResult } from "@/features/portfolio/score/types"
import { cn } from "@/lib/utils"

interface CriterionBreakdownListProps {
  criteria: CriterionResult[]
}

function scoreColor(score: number, weight: number): string {
  const ratio = weight > 0 ? score / weight : 0
  if (ratio >= 0.75) return "text-gain"
  if (ratio >= 0.5) return "text-amber-600 dark:text-amber-500"
  return "text-loss"
}

/// The transparent breakdown — every criterion shown separately with its
/// exact score/weight and the sentence that explains why, matching the
/// spec's "o usuário deve conseguir entender exatamente por que recebeu
/// aquela nota" requirement. `score: null` renders "Não aplicável" rather
/// than a 0, so an inapplicable criterion never reads as a bad result.
export function CriterionBreakdownList({ criteria }: CriterionBreakdownListProps) {
  return (
    <div className="space-y-4">
      {criteria.map((criterion) => (
        <div key={criterion.key} className="space-y-1 border-b border-border pb-4 last:border-0 last:pb-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <p className="text-sm font-medium">{criterion.label}</p>
              <CriterionInfoPopover label={criterion.label} explanation={criterion.explanation} />
            </div>
            <p
              className={cn(
                "text-sm font-semibold tabular-nums",
                criterion.score != null ? scoreColor(criterion.score, criterion.weight) : "text-muted-foreground"
              )}
            >
              {criterion.score != null ? `${criterion.score}/${criterion.weight}` : "Não aplicável"}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">{criterion.summary}</p>
        </div>
      ))}
    </div>
  )
}
