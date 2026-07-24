"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { saveMarketFilterAction } from "@/features/market/discovery-actions"
import type { MarketFilters, MarketSortOption } from "@/features/market/discovery-types"

interface SaveFilterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: MarketFilters
  sort: MarketSortOption
  onSaved: () => void
}

export function SaveFilterDialog({ open, onOpenChange, filters, sort, onSaved }: SaveFilterDialogProps) {
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    const result = await saveMarketFilterAction(name, filters, sort)
    setSaving(false)

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível salvar o filtro.")
      return
    }
    toast.success(`Filtro "${name.trim()}" salvo.`)
    setName("")
    onOpenChange(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Salvar filtro</DialogTitle>
          <DialogDescription>
            Dê um nome para esta combinação de filtros e ordenação — ela ficará disponível em
            &quot;Meus filtros&quot;.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="filter-name">Nome</Label>
          <Input
            id="filter-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Dividendos, Small Caps, Bancos..."
            maxLength={60}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={saving} disabled={name.trim().length === 0}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
