"use client"

import { Plus } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { TradeDialog } from "@/features/portfolio/components/TradeDialog"

export function AddInvestmentButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Adicionar Investimento
      </Button>
      <TradeDialog type="BUY" open={open} onOpenChange={setOpen} />
    </>
  )
}
