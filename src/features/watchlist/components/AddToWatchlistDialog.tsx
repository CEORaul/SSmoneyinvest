"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
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
import { addWatchlistItemAction, getWatchlistsAction } from "@/features/watchlist/actions"
import type { WatchlistSummary } from "@/features/watchlist/types"

interface AddToWatchlistDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  ticker: string
}

/// Generic "which list?" picker for adding a company to the Monitor de
/// Ativos from anywhere in the app that only knows the company, not a
/// specific list (e.g. a news card) — a profile can own several lists, so
/// "adicionar ao Monitor de Ativos" can't silently pick one. Lists are
/// fetched lazily on first open, not on every mount.
export function AddToWatchlistDialog({ open, onOpenChange, companyId, ticker }: AddToWatchlistDialogProps) {
  const [watchlists, setWatchlists] = useState<WatchlistSummary[] | null>(null)
  const [addingId, setAddingId] = useState<string | null>(null)

  useEffect(() => {
    if (open && watchlists == null) {
      getWatchlistsAction().then(setWatchlists)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-fetch when reopened with no cached list yet
  }, [open])

  async function handleAdd(watchlistId: string) {
    setAddingId(watchlistId)
    const result = await addWatchlistItemAction({ watchlistId, companyId })
    setAddingId(null)
    if (result.ok) {
      toast.success(`${ticker} adicionado à lista.`)
      onOpenChange(false)
    } else {
      toast.error(result.error ?? "Não foi possível adicionar.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Adicionar ao Monitor de Ativos</DialogTitle>
          <DialogDescription>Escolha em qual lista adicionar {ticker}.</DialogDescription>
        </DialogHeader>

        {watchlists == null ? (
          <p className="text-sm text-muted-foreground">Carregando listas...</p>
        ) : watchlists.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Você ainda não tem nenhuma lista.{" "}
            <Link href="/watchlist" className="underline">
              Crie uma no Monitor de Ativos
            </Link>
            .
          </p>
        ) : (
          <div className="space-y-1.5">
            {watchlists.map((watchlist) => (
              <Button
                key={watchlist.id}
                variant="outline"
                className="w-full justify-start"
                loading={addingId === watchlist.id}
                onClick={() => handleAdd(watchlist.id)}
              >
                {watchlist.icon && <span>{watchlist.icon}</span>}
                {watchlist.name}
              </Button>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
