"use client"

import { Button } from "@/components/ui/button"
import { DEFAULT_MARKET_FILTERS, type MarketFilters } from "@/features/market/discovery-types"

interface QuickFilterOption {
  id: string
  label: string
  filters: MarketFilters
  requiresAuth?: boolean
}

const QUICK_FILTERS: QuickFilterOption[] = [
  { id: "todos", label: "Todos", filters: DEFAULT_MARKET_FILTERS },
  { id: "acoes", label: "Ações", filters: { ...DEFAULT_MARKET_FILTERS, categoria: "STOCK" } },
  { id: "fiis", label: "FIIs", filters: { ...DEFAULT_MARKET_FILTERS, categoria: "FII" } },
  { id: "etfs", label: "ETFs", filters: { ...DEFAULT_MARKET_FILTERS, categoria: "ETF" } },
  { id: "cripto", label: "Cripto", filters: { ...DEFAULT_MARKET_FILTERS, categoria: "CRYPTO" } },
  // BDR is the closest real category this app has to "ativos do exterior"
  // (Brazilian Depositary Receipts of foreign companies) — there's no
  // dedicated international AssetClass to filter on instead.
  { id: "exterior", label: "Exterior", filters: { ...DEFAULT_MARKET_FILTERS, categoria: "BDR" } },
  { id: "dividendos", label: "Dividendos", filters: { ...DEFAULT_MARKET_FILTERS, pagadoraDividendos: true } },
  { id: "favoritos", label: "Favoritos", filters: { ...DEFAULT_MARKET_FILTERS, scope: "favorites" }, requiresAuth: true },
  // "Monitor de Ativos" was fully removed from this app earlier — "Alertas"
  // is its documented closest living equivalent everywhere else too.
  { id: "monitor", label: "Monitor de Ativos", filters: { ...DEFAULT_MARKET_FILTERS, scope: "alerts" }, requiresAuth: true },
  { id: "carteira", label: "Minha Carteira", filters: { ...DEFAULT_MARKET_FILTERS, scope: "portfolio" }, requiresAuth: true },
]

interface MarketQuickFiltersProps {
  activeId: string
  isAuthenticated: boolean
  onSelect: (id: string, filters: MarketFilters) => void
}

/// Mercado 2.0's quick-filter row — each button applies a real MarketFilters
/// value (categoria/pagadoraDividendos/scope, never a fake client-only
/// filter) and scrolls the discovery board into view. Favoritos/Monitor de
/// Ativos/Minha Carteira are scope-based (server-resolved, see
/// discovery-queries.ts's resolveScopeCompanyIds) and hidden for anonymous
/// visitors, who have no favorites/alerts/portfolio to scope to.
export function MarketQuickFilters({ activeId, isAuthenticated, onSelect }: MarketQuickFiltersProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {QUICK_FILTERS.filter((option) => !option.requiresAuth || isAuthenticated).map((option) => (
        <Button
          key={option.id}
          variant={activeId === option.id ? "secondary" : "outline"}
          size="sm"
          onClick={() => onSelect(option.id, option.filters)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}
