"use client"

import { Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { deleteMarketFilterAction } from "@/features/market/discovery-actions"
import type { MarketFilters, MarketSortOption, SavedMarketFilterSummary } from "@/features/market/discovery-types"

interface SavedFiltersPanelProps {
  savedFilters: SavedMarketFilterSummary[]
  onApply: (filters: MarketFilters, sort: MarketSortOption) => void
  onDeleted: (id: string) => void
}

/// "Meus filtros" — applying one replaces the board's current filters/sort
/// in one click; nothing here re-fetches on its own, the parent's existing
/// search effect reacts to the filters/sort change like any other edit.
export function SavedFiltersPanel({ savedFilters, onApply, onDeleted }: SavedFiltersPanelProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  if (savedFilters.length === 0) return null

  async function handleDelete(id: string) {
    setDeletingId(id)
    const result = await deleteMarketFilterAction(id)
    setDeletingId(null)
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível remover o filtro.")
      return
    }
    onDeleted(id)
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Meus filtros</p>
      <div className="flex flex-wrap gap-1.5">
        {savedFilters.map((saved) => (
          <div key={saved.id} className="flex items-center gap-0.5 rounded-lg border border-border">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-r-none"
              onClick={() => onApply(saved.filters, saved.sort)}
            >
              {saved.name}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-l-none text-muted-foreground hover:text-loss"
              disabled={deletingId === saved.id}
              aria-label={`Remover filtro ${saved.name}`}
              onClick={() => handleDelete(saved.id)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
