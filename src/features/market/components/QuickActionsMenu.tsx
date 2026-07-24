"use client"

import { ExternalLink, GitCompare, Heart, MoreHorizontal, Plus } from "lucide-react"
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
import { toggleFavoriteAction } from "@/features/company/actions"
import { TradeDialog } from "@/features/portfolio/components/TradeDialog"
import type { MarketAssetRow } from "@/features/market/discovery-types"

interface QuickActionsMenuProps {
  asset: MarketAssetRow
}

/// One dropdown reused by both the table and card views — "Adicionar aos
/// Favoritos"/"Adicionar à Carteira" call the exact same Server Actions
/// TradeDialog/CategorySection already use elsewhere; an anonymous visitor
/// clicking either is redirected to /login by requireUser() itself (see
/// src/lib/auth/session.ts), no separate auth-gating needed here.
export function QuickActionsMenu({ asset }: QuickActionsMenuProps) {
  const router = useRouter()
  const [tradeOpen, setTradeOpen] = useState(false)
  const [favoriting, setFavoriting] = useState(false)

  async function handleFavorite(event: React.MouseEvent) {
    event.stopPropagation()
    setFavoriting(true)
    const result = await toggleFavoriteAction(asset.id, asset.ticker)
    setFavoriting(false)
    if (result.ok) {
      toast.success(result.favorited ? `${asset.ticker} adicionado aos favoritos.` : `${asset.ticker} removido dos favoritos.`)
    } else {
      toast.error(result.error ?? "Não foi possível atualizar os favoritos.")
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Ações para ${asset.ticker}`}
              onClick={(e) => e.stopPropagation()}
            />
          }
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setTradeOpen(true) }}>
            <Plus className="size-4" />
            Adicionar à Carteira
          </DropdownMenuItem>
          <DropdownMenuItem disabled={favoriting} onClick={handleFavorite}>
            <Heart className="size-4" />
            Adicionar aos Favoritos
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => { e.stopPropagation(); router.push(`/comparar?tickers=${asset.ticker}`) }}
          >
            <GitCompare className="size-4" />
            Comparar
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => { e.stopPropagation(); router.push(`/empresa/${asset.ticker}`) }}
          >
            <ExternalLink className="size-4" />
            Abrir página
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <TradeDialog
        type="BUY"
        company={{
          id: asset.id,
          ticker: asset.ticker,
          name: asset.name,
          logoUrl: asset.logoUrl,
          assetClass: asset.assetClass,
          priceSource: asset.priceSource,
        }}
        open={tradeOpen}
        onOpenChange={setTradeOpen}
      />
    </>
  )
}
