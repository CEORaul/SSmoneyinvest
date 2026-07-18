import { ArrowDown, ArrowUp } from "lucide-react"

import { cn } from "@/lib/utils"
import { formatPercent } from "@/utils/format"

interface PriceChangeTagProps {
  changePct: number
  className?: string
}

export function PriceChangeTag({ changePct, className }: PriceChangeTagProps) {
  const isGain = changePct >= 0
  const Icon = isGain ? ArrowUp : ArrowDown

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-sm font-medium tabular-nums",
        isGain ? "text-gain" : "text-loss",
        className
      )}
    >
      <Icon className="size-3.5" />
      {formatPercent(changePct)}
    </span>
  )
}
