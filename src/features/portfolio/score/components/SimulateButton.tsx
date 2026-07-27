"use client"

import { FlaskConical } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { SimulationDialog } from "@/features/portfolio/score/components/SimulationDialog"
import type { PortfolioScoreResult } from "@/features/portfolio/score/types"
import type { PortfolioSummary } from "@/features/portfolio/queries"

interface SimulateButtonProps {
  summary: PortfolioSummary
  currentResult: PortfolioScoreResult
}

export function SimulateButton({ summary, currentResult }: SimulateButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FlaskConical className="size-4" />
        Simular mudanças
      </Button>
      <SimulationDialog open={open} onOpenChange={setOpen} summary={summary} currentResult={currentResult} />
    </>
  )
}
