"use client"

import { ChevronDown, Loader2, Sparkles } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { AssetClass } from "@/generated/prisma/client"
import {
  getDividendPayersTickersAction,
  getFavoriteTickersAction,
  getMarketTopTickersAction,
  getPortfolioTickersAction,
  getPortfolioTickersByFilterAction,
  getTopHoldingsTickersAction,
} from "@/features/comparator/actions"

interface QuickSelectItem {
  key: string
  label: string
  fetch: () => Promise<string[]>
}

const MARKET_ITEMS: QuickSelectItem[] = [
  { key: "portfolio", label: "Minha Carteira", fetch: getPortfolioTickersAction },
  { key: "stocks", label: "Todas as Ações", fetch: () => getMarketTopTickersAction("STOCK") },
  { key: "fiis", label: "Todos os FIIs", fetch: () => getMarketTopTickersAction("FII") },
  { key: "etfs", label: "Todos ETFs", fetch: () => getMarketTopTickersAction("ETF") },
  { key: "cryptos", label: "Todas Criptos", fetch: () => getMarketTopTickersAction("CRYPTO") },
  { key: "favorites", label: "Favoritos", fetch: getFavoriteTickersAction },
  { key: "top-holdings", label: "Maiores posições", fetch: getTopHoldingsTickersAction },
  { key: "dividends", label: "Dividendos", fetch: getDividendPayersTickersAction },
]

const PORTFOLIO_FILTER: { key: string; label: string; assetClass?: AssetClass; favoritesOnly?: boolean }[] = [
  { key: "all", label: "Todas posições" },
  { key: "stocks", label: "Somente ações", assetClass: "STOCK" },
  { key: "fiis", label: "Somente FIIs", assetClass: "FII" },
  { key: "etfs", label: "Somente ETFs", assetClass: "ETF" },
  { key: "cryptos", label: "Somente Criptos", assetClass: "CRYPTO" },
  { key: "favorites", label: "Somente ativos favoritos", favoritesOnly: true },
]

const PORTFOLIO_ITEMS: QuickSelectItem[] = PORTFOLIO_FILTER.map((filter) => ({
  key: filter.key,
  label: filter.label,
  fetch: () =>
    getPortfolioTickersByFilterAction({ assetClass: filter.assetClass, favoritesOnly: filter.favoritesOnly }),
}))

interface QuickSelectMenuProps {
  scope: "market" | "portfolio"
  onSelect: (tickers: string[]) => void
  onEmpty?: (label: string) => void
}

/// One component, two scopes: the general market-wide picker (8 shortcuts)
/// and "Comparar minha carteira"'s own sub-filters (6 shortcuts) — both are
/// just a list of (label, ticker-fetcher) pairs, so there's nothing about
/// either scope that needs a separate component.
export function QuickSelectMenu({ scope, onSelect, onEmpty }: QuickSelectMenuProps) {
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const items = scope === "market" ? MARKET_ITEMS : PORTFOLIO_ITEMS

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
        {scope === "market" ? "Seleção rápida" : "Comparar minha carteira"}
        <ChevronDown className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {scope === "portfolio" && <DropdownMenuLabel>Comparar minha carteira</DropdownMenuLabel>}
        {scope === "portfolio" && <DropdownMenuSeparator />}
        {items.map((item) => (
          <DropdownMenuItem key={item.key} onClick={() => handleSelect(item)} disabled={pendingKey !== null}>
            {pendingKey === item.key ? <Loader2 className="size-4 animate-spin" /> : null}
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
