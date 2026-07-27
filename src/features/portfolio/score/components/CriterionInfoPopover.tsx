"use client"

import { HelpCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { CriterionExplanation } from "@/features/portfolio/score/types"

interface CriterionInfoPopoverProps {
  label: string
  explanation: CriterionExplanation
}

/// The "?" button next to every criterion — always explains what it means,
/// how it was calculated, and why it affects the Score. Nothing here is
/// AI-generated: these three fields come straight from the criterion
/// definition in criteria.ts, so the explanation can never drift from the
/// actual formula that produced the number next to it.
export function CriterionInfoPopover({ label, explanation }: CriterionInfoPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`O que significa ${label}`} className="size-5" />}>
        <HelpCircle className="size-3.5 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-3">
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-muted-foreground">O que significa</p>
          <p className="text-sm">{explanation.whatItMeans}</p>
        </div>
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-muted-foreground">Como foi calculado</p>
          <p className="text-sm">{explanation.howItsCalculated}</p>
        </div>
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-muted-foreground">Por que influencia o Score</p>
          <p className="text-sm">{explanation.whyItMatters}</p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
