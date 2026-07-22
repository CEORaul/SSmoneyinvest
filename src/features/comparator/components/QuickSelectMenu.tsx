"use client"

import { ChevronDown, Loader2, Sparkles } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  getFavoriteTickersAction,
  getPortfolioTickersAction,
  getPortfolioTickersByFilterAction,
  getTopHoldingsTickersAction,
} from "@/features/comparator/actions"

interface QuickSelectItem {
  key: string
  label: string
  fetch: () => Promise<string[]>
}

/// Every shortcut here is scoped to the signed-in user's own account — no
/// market-wide "top N by market cap" option. That used to live alongside
/// these (a separate "Seleção rápida" menu), but comparing random top-cap
/// stocks the user doesn't hold read as broken/confusing in practice, so
/// it was removed rather than fixed — the whole point of this menu is
/// "based on my portfolio."
const ITEMS: QuickSelectItem[] = [
  { key: "all", label: "Todas as posições", fetch: getPortfolioTickersAction },
  { key: "top-holdings", label: "Maiores posições", fetch: getTopHoldingsTickersAction },
  { key: "stocks", label: "Somente ações", fetch: () => getPortfolioTickersByFilterAction({ assetClass: "STOCK" }) },
  { key: "fiis", label: "Somente FIIs", fetch: () => getPortfolioTickersByFilterAction({ assetClass: "FII" }) },
  { key: "etfs", label: "Somente ETFs", fetch: () => getPortfolioTickersByFilterAction({ assetClass: "ETF" }) },
  { key: "cryptos", label: "Somente Criptos", fetch: () => getPortfolioTickersByFilterAction({ assetClass: "CRYPTO" }) },
  { key: "favorites", label: "Favoritos", fetch: getFavoriteTickersAction },
]

interface QuickSelectMenuProps {
  onSelect: (tickers: string[]) => void
  onEmpty?: (label: string) => void
}

export function QuickSelectMenu({ onSelect, onEmpty }: QuickSelectMenuProps) {
  const [pendingKey, setPendingKey] = useState<string | null>(null)

  async function handleSelect(item: QuickSelectItem) {
    setPendingKey(item.key)
    const tickers = await item.fetch()
    setPendingKey(null)
    if (tickers.length === 0) {
      onEmpty?.(item.label)
      return
    }
    onSelect(tickers)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        <Sparkles className="size-4" />
        Comparar minha carteira
        <ChevronDown className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {ITEMS.map((item) => (
          <DropdownMenuItem key={item.key} onClick={() => handleSelect(item)} disabled={pendingKey !== null}>
            {pendingKey === item.key ? <Loader2 className="size-4 animate-spin" /> : null}
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
