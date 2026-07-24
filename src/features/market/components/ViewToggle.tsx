"use client"

import { LayoutGrid, Table2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { MarketView } from "@/features/market/discovery-types"

interface ViewToggleProps {
  value: MarketView
  onChange: (view: MarketView) => void
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="flex gap-1 rounded-lg bg-muted p-0.5">
      <Button
        variant={value === "table" ? "default" : "ghost"}
        size="sm"
        onClick={() => onChange("table")}
        aria-label="Ver como tabela"
      >
        <Table2 className="size-4" />
        Tabela
      </Button>
      <Button
        variant={value === "cards" ? "default" : "ghost"}
        size="sm"
        onClick={() => onChange("cards")}
        aria-label="Ver como cards"
      >
        <LayoutGrid className="size-4" />
        Cards
      </Button>
    </div>
  )
}
