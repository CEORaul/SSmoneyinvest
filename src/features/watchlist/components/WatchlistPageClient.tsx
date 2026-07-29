"use client"

import { Eye } from "lucide-react"
import { useMemo, useState } from "react"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AnalyzeWatchlistPanel } from "@/features/watchlist/components/AnalyzeWatchlistPanel"
import { AddWatchlistItemButton } from "@/features/watchlist/components/AddWatchlistItemButton"
import { WatchlistCompareBar } from "@/features/watchlist/components/WatchlistCompareBar"
import { WatchlistItemsCards } from "@/features/watchlist/components/WatchlistItemsCards"
import { WatchlistItemsTable } from "@/features/watchlist/components/WatchlistItemsTable"
import { WatchlistSelector } from "@/features/watchlist/components/WatchlistSelector"
import { WatchlistStatsHeader } from "@/features/watchlist/components/WatchlistStatsHeader"
import { WatchlistToolbar } from "@/features/watchlist/components/WatchlistToolbar"
import { getWatchlistItemsAction, getWatchlistStatsAction, getWatchlistsAction } from "@/features/watchlist/actions"
import { filterWatchlistItems, sortWatchlistItems } from "@/features/watchlist/filter-sort"
import {
  DEFAULT_WATCHLIST_FILTERS,
  type WatchlistFilters,
  type WatchlistItemRow,
  type WatchlistSortOption,
  type WatchlistStats,
  type WatchlistSummary,
} from "@/features/watchlist/types"

interface WatchlistPageClientProps {
  initialWatchlists: WatchlistSummary[]
  initialSelectedId: string | null
  initialItems: WatchlistItemRow[]
  initialStats: WatchlistStats
}

function countActiveFilters(filters: WatchlistFilters): number {
  let count = 0
  if (filters.assetClass !== "TODOS") count++
  if (filters.sector) count++
  if (filters.precoMinCents != null) count++
  if (filters.precoMaxCents != null) count++
  if (filters.pagadoraDividendos) count++
  return count
}

/// The whole Watchlist experience: list selector + stats + toolbar + items
/// + AI panel + compare bar, all driven from client state. Every mutation
/// (create/edit/delete list, add/remove item) re-fetches through the Server
/// Actions rather than mutating local state optimistically for anything
/// that touches Company-derived data — the item list has too many derived
/// fields (weekly/monthly change, DY, alert count) to safely patch by hand.
export function WatchlistPageClient({
  initialWatchlists,
  initialSelectedId,
  initialItems,
  initialStats,
}: WatchlistPageClientProps) {
  const [watchlists, setWatchlists] = useState(initialWatchlists)
  const [selectedId, setSelectedId] = useState(initialSelectedId)
  const [items, setItems] = useState(initialItems)
  const [stats, setStats] = useState(initialStats)
  const [loadingItems, setLoadingItems] = useState(false)

  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<WatchlistSortOption>("nome")
  const [filters, setFilters] = useState<WatchlistFilters>(DEFAULT_WATCHLIST_FILTERS)
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<Set<string>>(new Set())

  const selectedWatchlist = watchlists.find((w) => w.id === selectedId) ?? null

  async function refreshStats() {
    setStats(await getWatchlistStatsAction())
  }

  async function refreshWatchlists() {
    setWatchlists(await getWatchlistsAction())
  }

  async function loadItems(watchlistId: string) {
    setLoadingItems(true)
    setSelectedCompanyIds(new Set())
    const found = await getWatchlistItemsAction(watchlistId)
    setItems(found)
    setLoadingItems(false)
  }

  async function handleSelect(id: string) {
    setSelectedId(id)
    await loadItems(id)
  }

  async function handleCreated(id: string) {
    await refreshWatchlists()
    setSelectedId(id)
    await loadItems(id)
  }

  async function handleEdited() {
    await refreshWatchlists()
  }

  async function handleDeleted(id: string) {
    const remaining = watchlists.filter((w) => w.id !== id)
    setWatchlists(remaining)
    await refreshStats()
    if (selectedId === id) {
      const next = remaining[0] ?? null
      setSelectedId(next?.id ?? null)
      if (next) await loadItems(next.id)
      else setItems([])
    }
  }

  async function handleItemAdded() {
    if (selectedId) await loadItems(selectedId)
    await refreshWatchlists()
    await refreshStats()
  }

  async function handleItemRemoved(itemId: string) {
    setItems((current) => current.filter((item) => item.id !== itemId))
    await refreshWatchlists()
    await refreshStats()
  }

  function toggleSelectCompany(companyId: string) {
    setSelectedCompanyIds((current) => {
      const next = new Set(current)
      if (next.has(companyId)) next.delete(companyId)
      else next.add(companyId)
      return next
    })
  }

  const visibleItems = useMemo(() => {
    return sortWatchlistItems(filterWatchlistItems(items, filters, search), sort)
  }, [items, filters, search, sort])

  const sectors = useMemo(() => {
    const set = new Set<string>()
    for (const item of items) if (item.sector) set.add(item.sector)
    return [...set].sort()
  }, [items])

  const selectedTickers = useMemo(
    () => items.filter((item) => selectedCompanyIds.has(item.companyId)).map((item) => item.ticker),
    [items, selectedCompanyIds]
  )

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Eye className="size-6 text-primary" />
          Watchlist
        </h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe oportunidades e ativos de interesse, mesmo sem possuí-los na carteira.
        </p>
      </div>

      <WatchlistStatsHeader stats={stats} />

      <WatchlistSelector
        watchlists={watchlists}
        selectedId={selectedId}
        onSelect={handleSelect}
        onCreated={handleCreated}
        onEdited={handleEdited}
        onDeleted={handleDeleted}
      />

      {!selectedWatchlist ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <Eye className="size-8 text-muted-foreground" />
            <p className="font-medium">Crie sua primeira lista</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Organize ativos que você quer acompanhar — dividendos, FIIs, oportunidades, o que fizer
              sentido para você.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {selectedWatchlist.description && (
            <p className="text-sm text-muted-foreground">{selectedWatchlist.description}</p>
          )}

          <AnalyzeWatchlistPanel key={selectedWatchlist.id} watchlistId={selectedWatchlist.id} />

          <WatchlistToolbar
            watchlistId={selectedWatchlist.id}
            onItemAdded={handleItemAdded}
            search={search}
            onSearchChange={setSearch}
            sort={sort}
            onSortChange={setSort}
            filters={filters}
            onFiltersChange={setFilters}
            sectors={sectors}
            activeFilterCount={countActiveFilters(filters)}
          />

          {loadingItems ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                <p className="font-medium">Nenhum ativo nesta lista ainda</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Pesquise por ticker, nome ou empresa para começar a acompanhar seus ativos de interesse.
                </p>
                <AddWatchlistItemButton watchlistId={selectedWatchlist.id} onAdded={handleItemAdded} />
              </CardContent>
            </Card>
          ) : visibleItems.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
              Nenhum ativo corresponde à busca ou aos filtros aplicados.
            </p>
          ) : (
            <>
              <div className="hidden lg:block">
                <WatchlistItemsTable
                  items={visibleItems}
                  selectedIds={selectedCompanyIds}
                  onToggleSelect={toggleSelectCompany}
                  onRemoved={handleItemRemoved}
                />
              </div>
              <div className="lg:hidden">
                <WatchlistItemsCards
                  items={visibleItems}
                  selectedIds={selectedCompanyIds}
                  onToggleSelect={toggleSelectCompany}
                  onRemoved={handleItemRemoved}
                />
              </div>
            </>
          )}
        </>
      )}

      <WatchlistCompareBar selectedTickers={selectedTickers} onClear={() => setSelectedCompanyIds(new Set())} />
    </div>
  )
}
