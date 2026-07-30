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
import { CreateAlertDialog } from "@/features/alerts/components/CreateAlertDialog"
import { toggleFavoriteAction } from "@/features/company/actions"
import { NewsImpactBadges } from "@/features/news/components/NewsImpactBadges"
import type { NewsMatchedCompany } from "@/features/news/types"
import { TradeDialog } from "@/features/portfolio/components/TradeDialog"
import type { CompanySearchResult } from "@/features/portfolio/queries"

interface NewsArticleQuickActionsProps {
  company: NewsMatchedCompany
}

/// One ticker chip per company a news article was matched against (see
/// company-matcher.ts) — an article can mention several assets, so the
/// integration actions (Abrir ativo/Adicionar alerta/Favoritos/Comparar)
/// are scoped per company, not per article. Reuses the exact same Server
/// Actions/dialogs the rest of the app already uses.
export function NewsArticleQuickActions({ company }: NewsArticleQuickActionsProps) {
  const router = useRouter()
  const [tradeOpen, setTradeOpen] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)
  const [favorited, setFavorited] = useState(company.isFavorited)
  const [favoriting, setFavoriting] = useState(false)

  const searchResult: CompanySearchResult = {
    id: company.id,
    ticker: company.ticker,
    name: company.name,
    assetClass: company.assetClass,
    logoUrl: company.logoUrl,
    priceCents: company.priceCents,
    priceSource: company.priceSource,
  }

  async function handleFavorite(event: React.MouseEvent) {
    event.stopPropagation()
    setFavoriting(true)
    const result = await toggleFavoriteAction(company.id, company.ticker)
    setFavoriting(false)
    if (result.ok) {
      setFavorited(result.favorited ?? !favorited)
      toast.success(result.favorited ? `${company.ticker} adicionado aos favoritos.` : `${company.ticker} removido dos favoritos.`)
    } else {
      toast.error(result.error ?? "Não foi possível atualizar os favoritos.")
    }
  }

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-border py-0.5 pr-0.5 pl-2 text-xs">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          router.push(`/empresa/${company.ticker}`)
        }}
        className="font-medium hover:underline"
      >
        {company.ticker}
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Ações para ${company.ticker}`}
              onClick={(e) => e.stopPropagation()}
            />
          }
        >
          <MoreHorizontal className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/empresa/${company.ticker}`) }}>
            <ExternalLink className="size-4" />
            Abrir ativo
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setAlertOpen(true) }}>
            <Plus className="size-4" />
            Adicionar alerta
          </DropdownMenuItem>
          <DropdownMenuItem disabled={favoriting} onClick={handleFavorite}>
            <Heart className="size-4" />
            {favorited ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setTradeOpen(true) }}>
            <Plus className="size-4" />
            Adicionar à Carteira
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => { e.stopPropagation(); router.push(`/comparar?tickers=${company.ticker}`) }}
          >
            <GitCompare className="size-4" />
            Comparar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <NewsImpactBadges isOwned={company.isOwned} isAlerted={company.isAlerted} isFavorited={favorited} />

      <TradeDialog type="BUY" company={searchResult} open={tradeOpen} onOpenChange={setTradeOpen} />
      <CreateAlertDialog open={alertOpen} onOpenChange={setAlertOpen} onSaved={() => setAlertOpen(false)} initialCompany={searchResult} />
    </div>
  )
}
