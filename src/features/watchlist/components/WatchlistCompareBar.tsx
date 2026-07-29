"use client"

import { GitCompare, X } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"

interface WatchlistCompareBarProps {
  selectedTickers: string[]
  onClear: () => void
}

/// Selecting assets across the table/cards feeds straight into the same
/// /comparar?tickers=... entry point Mercado already uses — no new
/// comparison logic here, just the multi-select UI.
export function WatchlistCompareBar({ selectedTickers, onClear }: WatchlistCompareBarProps) {
  const router = useRouter()

  if (selectedTickers.length === 0) return null

  return (
    <div className="sticky bottom-4 z-30 flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-lg">
      <p className="text-sm">
        <span className="font-semibold">{selectedTickers.length}</span> ativo(s) selecionado(s)
      </p>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="size-4" />
          Limpar
        </Button>
        <Button size="sm" onClick={() => router.push(`/comparar?tickers=${selectedTickers.join(",")}`)}>
          <GitCompare className="size-4" />
          Comparar
        </Button>
      </div>
    </div>
  )
}
