"use client"

import { Bell, ExternalLink, GitCompare, Heart, MoreHorizontal, Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CreateAlertDialog } from "@/features/alerts/components/CreateAlertDialog"
import { toggleFavoriteAction } from "@/features/company/actions"
import { TradeDialog } from "@/features/portfolio/components/TradeDialog"
import type { CompanySearchResult } from "@/features/portfolio/queries"
import { removeWatchlistItemAction } from "@/features/watchlist/actions"
import type { WatchlistItemRow } from "@/features/watchlist/types"

interface WatchlistQuickActionsProps {
  item: WatchlistItemRow
  onRemoved?: (itemId: string) => void
}

/// One shared actions cluster for both the desktop table and the
/// tablet/mobile cards: a standalone 🔔 button for "Alerta Rápido" (never
/// leaves the Watchlist), plus a "..." dropdown for the rest of the card's
/// required actions. Reuses the exact same Server Actions/dialogs Mercado's
/// QuickActionsMenu already uses (toggleFavoriteAction, TradeDialog) — a
/// separate component instead of a shared one because this row also needs
/// a "Remover da Watchlist" action and the bell, which QuickActionsMenu's
/// MarketAssetRow-typed props don't carry.
export function WatchlistQuickActions({ item, onRemoved }: WatchlistQuickActionsProps) {
  const router = useRouter()
  const [tradeOpen, setTradeOpen] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)
  const [favorited, setFavorited] = useState(item.isFavorited)
  const [favoriting, setFavoriting] = useState(false)
  const [removing, setRemoving] = useState(false)

  const searchResult: CompanySearchResult = {
    id: item.companyId,
    ticker: item.ticker,
    name: item.name,
    assetClass: item.assetClass,
    logoUrl: item.logoUrl,
    priceCents: item.priceCents,
    priceSource: item.priceSource,
  }

  async function handleFavorite(event: React.MouseEvent) {
    event.stopPropagation()
    setFavoriting(true)
    const result = await toggleFavoriteAction(item.companyId, item.ticker)
    setFavoriting(false)
    if (result.ok) {
      setFavorited(result.favorited ?? !favorited)
      toast.success(result.favorited ? `${item.ticker} adicionado aos favoritos.` : `${item.ticker} removido dos favoritos.`)
    } else {
      toast.error(result.error ?? "Não foi possível atualizar os favoritos.")
    }
  }

  async function handleRemove(event: React.MouseEvent) {
    event.stopPropagation()
    setRemoving(true)
    const result = await removeWatchlistItemAction(item.id)
    setRemoving(false)
    if (result.ok) {
      toast.success(`${item.ticker} removido da lista.`)
      onRemoved?.(item.id)
    } else {
      toast.error(result.error ?? "Não foi possível remover o ativo.")
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Criar alerta rápido para ${item.ticker}`}
        onClick={(e) => {
          e.stopPropagation()
          setAlertOpen(true)
        }}
      >
        <Bell className="size-4" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Ações para ${item.ticker}`}
              onClick={(e) => e.stopPropagation()}
            />
          }
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/empresa/${item.ticker}`) }}>
            <ExternalLink className="size-4" />
            Abrir página
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => { e.stopPropagation(); router.push(`/comparar?tickers=${item.ticker}`) }}
          >
            <GitCompare className="size-4" />
            Comparar
          </DropdownMenuItem>
          <DropdownMenuItem disabled={favoriting} onClick={handleFavorite}>
            <Heart className="size-4" />
            {favorited ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setTradeOpen(true) }}>
            <Plus className="size-4" />
            Adicionar à Carteira
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" disabled={removing} onClick={handleRemove}>
            <Trash2 className="size-4" />
            Remover do Monitor de Ativos
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <TradeDialog
        type="BUY"
        company={{
          id: item.companyId,
          ticker: item.ticker,
          name: item.name,
          logoUrl: item.logoUrl,
          assetClass: item.assetClass,
          priceSource: item.priceSource,
        }}
        open={tradeOpen}
        onOpenChange={setTradeOpen}
      />

      <CreateAlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        onSaved={() => setAlertOpen(false)}
        initialCompany={searchResult}
      />
    </div>
  )
}
