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
import { Textarea } from "@/components/ui/textarea"
import { createWatchlistAction, updateWatchlistAction } from "@/features/watchlist/actions"
import type { WatchlistSummary } from "@/features/watchlist/types"
import { cn } from "@/lib/utils"

const ICON_PRESETS = ["⭐", "📈", "💰", "🏢", "📊", "🪙", "🌎", "🚀", "🎯", "💎", "🏦", "🔬"]
const COLOR_PRESETS = [
  "#22c55e",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#06b6d4",
  "#ec4899",
  "#64748b",
]

interface WatchlistFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (id: string) => void
  /// When set, edits (renames/restyles) this list instead of creating one.
  editWatchlist?: WatchlistSummary | null
}

/// One dialog for both "Nova lista" and "Editar lista" — same fields either
/// way, only the submitted action and dialog copy differ. Icon/color are
/// simple fixed-preset pickers (no upload, no arbitrary hex input) so every
/// list renders consistently across the selector, stats, and item cards.
export function WatchlistFormDialog({ open, onOpenChange, onSaved, editWatchlist }: WatchlistFormDialogProps) {
  const isEdit = !!editWatchlist
  const [name, setName] = useState(editWatchlist?.name ?? "")
  const [description, setDescription] = useState(editWatchlist?.description ?? "")
  const [icon, setIcon] = useState(editWatchlist?.icon ?? ICON_PRESETS[0])
  const [color, setColor] = useState(editWatchlist?.color ?? COLOR_PRESETS[0])
  const [saving, setSaving] = useState(false)

  function reset() {
    setName("")
    setDescription("")
    setIcon(ICON_PRESETS[0])
    setColor(COLOR_PRESETS[0])
  }

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("Dê um nome para a lista.")
      return
    }

    setSaving(true)
    const input = { name: name.trim(), description: description.trim() || undefined, icon, color }
    const result = isEdit
      ? await updateWatchlistAction({ id: editWatchlist!.id, ...input })
      : await createWatchlistAction(input)
    setSaving(false)

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível salvar a lista.")
      return
    }

    toast.success(isEdit ? "Lista atualizada." : "Lista criada.")
    const id = isEdit ? editWatchlist!.id : (result as { id?: string }).id
    if (!isEdit) reset()
    onOpenChange(false)
    if (id) onSaved(id)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isEdit) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar lista" : "Nova lista"}</DialogTitle>
          <DialogDescription>
            Organize ativos que você quer acompanhar, mesmo sem possuí-los na carteira.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="watchlist-name">Nome</Label>
            <Input
              id="watchlist-name"
              placeholder="Ex.: Dividendos, FIIs, Oportunidades"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="watchlist-description">Descrição (opcional)</Label>
            <Textarea
              id="watchlist-description"
              placeholder="Para que serve essa lista?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Ícone</Label>
            <div className="flex flex-wrap gap-1.5">
              {ICON_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setIcon(preset)}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg border text-lg transition-colors",
                    icon === preset ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  aria-label={preset}
                  onClick={() => setColor(preset)}
                  className={cn(
                    "size-7 rounded-full border-2 transition-transform",
                    color === preset ? "scale-110 border-foreground" : "border-transparent"
                  )}
                  style={{ backgroundColor: preset }}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            {isEdit ? "Salvar" : "Criar lista"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
