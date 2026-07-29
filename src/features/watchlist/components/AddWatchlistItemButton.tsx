"use client"

import { Plus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { AssetSearchCombobox } from "@/features/comparator/components/AssetSearchCombobox"
import type { CompanySearchResult } from "@/features/portfolio/queries"
import { addWatchlistItemAction } from "@/features/watchlist/actions"

interface AddWatchlistItemButtonProps {
  watchlistId: string
  onAdded: () => void
}

/// Reuses the exact same cross-category search already used by Mercado/
/// Score-simulation/FinIA — the spec asks for the same autocomplete, not a
/// new one.
export function AddWatchlistItemButton({ watchlistId, onAdded }: AddWatchlistItemButtonProps) {
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)

  async function handleSelect(company: CompanySearchResult) {
    setAdding(true)
    const result = await addWatchlistItemAction({ watchlistId, companyId: company.id })
    setAdding(false)
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível adicionar o ativo.")
      return
    }
    toast.success(`${company.ticker} adicionado à Watchlist.`)
    setOpen(false)
    onAdded()
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button size="sm" disabled={adding} />}>
        <Plus className="size-4" />
        Adicionar ativo
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <AssetSearchCombobox onSelect={handleSelect} disabled={adding} />
      </PopoverContent>
    </Popover>
  )
}
