import { Check, TriangleAlert } from "lucide-react"

import type { DataCoverage } from "@/features/company/coverage"
import { cn } from "@/lib/utils"

interface CoverageBannerProps {
  coverage: DataCoverage
}

export function CoverageBanner({ coverage }: CoverageBannerProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3">
      <p className="text-sm font-medium">
        Cobertura dos dados: <span className="tabular-nums">{coverage.pct}%</span>
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {coverage.checklist.map((item) => (
          <span
            key={item.label}
            className={cn(
              "inline-flex items-center gap-1 text-xs",
              item.ok ? "text-muted-foreground" : "text-amber-600 dark:text-amber-500"
            )}
          >
            {item.ok ? <Check className="size-3" /> : <TriangleAlert className="size-3" />}
            {item.label}
          </span>
        ))}
      </div>
    </div>
  )
}
