"use client"

import { SlidersHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { translateSector } from "@/features/company/sector-labels"
import { ASSET_CATEGORIES } from "@/features/portfolio/asset-category"
import { AddWatchlistItemButton } from "@/features/watchlist/components/AddWatchlistItemButton"
import { WATCHLIST_SORT_LABELS, type WatchlistFilters, type WatchlistSortOption } from "@/features/watchlist/types"

interface WatchlistToolbarProps {
  watchlistId: string
  onItemAdded: () => void
  search: string
  onSearchChange: (value: string) => void
  sort: WatchlistSortOption
  onSortChange: (value: WatchlistSortOption) => void
  filters: WatchlistFilters
  onFiltersChange: (filters: WatchlistFilters) => void
  sectors: string[]
  activeFilterCount: number
}

function toCents(value: string): number | null {
  const parsed = Number(value)
  return value.trim() === "" || Number.isNaN(parsed) ? null : Math.round(parsed * 100)
}

function fromCents(cents: number | null): string {
  return cents == null ? "" : String(cents / 100)
}

/// Search/sort/filter over an already-loaded item list — every control here
/// updates state synchronously (no debounce, unlike Mercado's server-backed
/// MarketFilterBar), since filtering a few hundred in-memory rows is cheap
/// enough to do on every keystroke.
export function WatchlistToolbar({
  watchlistId,
  onItemAdded,
  search,
  onSearchChange,
  sort,
  onSortChange,
  filters,
  onFiltersChange,
  sectors,
  activeFilterCount,
}: WatchlistToolbarProps) {
  function set<K extends keyof WatchlistFilters>(key: K, value: WatchlistFilters[K]) {
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Buscar na lista por ticker ou nome"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full sm:max-w-xs"
      />

      <Select value={sort} onValueChange={(v) => onSortChange(v as WatchlistSortOption)}>
        <SelectTrigger className="w-full sm:w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(WATCHLIST_SORT_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger render={<Button variant="outline" size="sm" />}>
          <SlidersHorizontal className="size-4" />
          Filtros
          {activeFilterCount > 0 && (
            <span className="ml-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-80 space-y-3" align="start">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Classe</Label>
            <Select value={filters.assetClass} onValueChange={(v) => set("assetClass", v as WatchlistFilters["assetClass"])}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todas as classes</SelectItem>
                {ASSET_CATEGORIES.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.emoji} {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Setor</Label>
            <Select value={filters.sector || "all"} onValueChange={(v) => set("sector", v === "all" || !v ? "" : v)}>
              <SelectTrigger className="w-full">
                <SelectValue>{(value: string) => (value === "all" ? "Todos setores" : translateSector(value))}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos setores</SelectItem>
                {sectors.map((sector) => (
                  <SelectItem key={sector} value={sector}>
                    {translateSector(sector)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Preço mínimo</Label>
              <Input
                type="number"
                min={0}
                placeholder="R$ 0"
                value={fromCents(filters.precoMinCents)}
                onChange={(e) => set("precoMinCents", toCents(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Preço máximo</Label>
              <Input
                type="number"
                min={0}
                placeholder="Sem limite"
                value={fromCents(filters.precoMaxCents)}
                onChange={(e) => set("precoMaxCents", toCents(e.target.value))}
              />
            </div>
          </div>

          <label className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground">
            <Checkbox
              checked={filters.pagadoraDividendos}
              onCheckedChange={(checked) => set("pagadoraDividendos", checked === true)}
            />
            <span className="cursor-pointer">Somente pagadoras de dividendos</span>
          </label>
        </PopoverContent>
      </Popover>

      <div className="ml-auto">
        <AddWatchlistItemButton watchlistId={watchlistId} onAdded={onItemAdded} />
      </div>
    </div>
  )
}
