"use client"

import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { translateSector } from "@/features/company/sector-labels"
import { getAssetCategoryMeta } from "@/features/portfolio/asset-category"
import { DEFAULT_MARKET_FILTERS, type MarketFilters } from "@/features/market/discovery-types"
import { formatCurrencyCents } from "@/utils/format"

interface ActiveFilterChip {
  key: keyof MarketFilters
  label: string
}

function buildChips(filters: MarketFilters): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = []
  if (filters.categoria !== "TODOS") {
    chips.push({ key: "categoria", label: getAssetCategoryMeta(filters.categoria).label })
  }
  if (filters.setor) chips.push({ key: "setor", label: translateSector(filters.setor) })
  if (filters.precoMinCents != null) {
    chips.push({ key: "precoMinCents", label: `Preço ≥ ${formatCurrencyCents(filters.precoMinCents)}` })
  }
  if (filters.precoMaxCents != null) {
    chips.push({ key: "precoMaxCents", label: `Preço ≤ ${formatCurrencyCents(filters.precoMaxCents)}` })
  }
  if (filters.dyMinPct != null) chips.push({ key: "dyMinPct", label: `DY ≥ ${filters.dyMinPct}%` })
  if (filters.plMax != null) chips.push({ key: "plMax", label: `P/L ≤ ${filters.plMax}` })
  if (filters.pvpMax != null) chips.push({ key: "pvpMax", label: `P/VP ≤ ${filters.pvpMax}` })
  if (filters.roeMinPct != null) chips.push({ key: "roeMinPct", label: `ROE ≥ ${filters.roeMinPct}%` })
  if (filters.liquidezMin != null) chips.push({ key: "liquidezMin", label: `Liquidez ≥ ${filters.liquidezMin}` })
  if (filters.marketCapMinCents != null) {
    chips.push({ key: "marketCapMinCents", label: `Market Cap ≥ ${formatCurrencyCents(filters.marketCapMinCents)}` })
  }
  if (filters.pagadoraDividendos) chips.push({ key: "pagadoraDividendos", label: "Pagadora de dividendos" })
  return chips
}

interface ActiveFiltersPanelProps {
  filters: MarketFilters
  onChange: (filters: MarketFilters) => void
}

/// "Filtros aplicados" — one removable chip per non-default filter value.
/// Renders nothing when every filter is at its default (no chips to show).
export function ActiveFiltersPanel({ filters, onChange }: ActiveFiltersPanelProps) {
  const chips = buildChips(filters)
  if (chips.length === 0) return null

  function remove(key: keyof MarketFilters) {
    onChange({ ...filters, [key]: DEFAULT_MARKET_FILTERS[key] })
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Filtros aplicados</p>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <Button key={chip.key} variant="secondary" size="sm" onClick={() => remove(chip.key)}>
            ✓ {chip.label}
            <X className="size-3" />
          </Button>
        ))}
        {chips.length > 1 && (
          <Button variant="ghost" size="sm" onClick={() => onChange(DEFAULT_MARKET_FILTERS)}>
            Limpar tudo
          </Button>
        )}
      </div>
    </div>
  )
}
