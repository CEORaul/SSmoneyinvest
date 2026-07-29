"use client"

import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteWatchlistAction } from "@/features/watchlist/actions"
import { WatchlistFormDialog } from "@/features/watchlist/components/WatchlistFormDialog"
import type { WatchlistSummary } from "@/features/watchlist/types"
import { cn } from "@/lib/utils"

interface WatchlistSelectorProps {
  watchlists: WatchlistSummary[]
  selectedId: string | null
  onSelect: (id: string) => void
  onCreated: (id: string) => void
  onEdited: () => void
  onDeleted: (id: string) => void
}

/// A horizontal pill row instead of a Tabs primitive — the list of tabs is
/// dynamic (create/rename/delete), each pill needs its own hover-revealed
/// actions menu, and there's no fixed per-tab content panel (the selected
/// id just drives which items query the page below re-fetches), so a plain
/// button row is a better fit than forcing this into Tabs' fixed-panel model.
export function WatchlistSelector({
  watchlists,
  selectedId,
  onSelect,
  onCreated,
  onEdited,
  onDeleted,
}: WatchlistSelectorProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<WatchlistSummary | null>(null)

  async function handleDelete(watchlist: WatchlistSummary) {
    const result = await deleteWatchlistAction(watchlist.id)
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível excluir a lista.")
      return
    }
    toast.success(`Lista "${watchlist.name}" excluída.`)
    onDeleted(watchlist.id)
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {watchlists.map((watchlist) => {
          const isSelected = watchlist.id === selectedId
          return (
            <div
              key={watchlist.id}
              className={cn(
                "group flex items-center gap-1 rounded-full border py-1 pl-3 pr-1 text-sm transition-colors",
                isSelected ? "border-primary bg-primary/10 text-foreground" : "border-border hover:bg-muted"
              )}
            >
              <button type="button" onClick={() => onSelect(watchlist.id)} className="flex items-center gap-1.5">
                {watchlist.icon && <span>{watchlist.icon}</span>}
                <span className="font-medium">{watchlist.name}</span>
                <span className="text-xs text-muted-foreground">({watchlist.itemCount})</span>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="opacity-0 group-hover:opacity-100"
                      aria-label={`Ações da lista ${watchlist.name}`}
                    />
                  }
                >
                  <MoreHorizontal className="size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setEditTarget(watchlist)
                      setFormOpen(true)
                    }}
                  >
                    <Pencil className="size-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => handleDelete(watchlist)}>
                    <Trash2 className="size-4" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        })}

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setEditTarget(null)
            setFormOpen(true)
          }}
        >
          <Plus className="size-4" />
          Nova lista
        </Button>
      </div>

      <WatchlistFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editWatchlist={editTarget}
        onSaved={(id) => (editTarget ? onEdited() : onCreated(id))}
      />
    </>
  )
}
