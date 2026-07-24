"use client"

import { AlertTriangle, Bookmark, SearchX } from "lucide-react"
import { useEffect, useRef, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ActiveFiltersPanel } from "@/features/market/components/ActiveFiltersPanel"
import { CategoryChips } from "@/features/market/components/CategoryChips"
import { MarketFilterBar } from "@/features/market/components/MarketFilterBar"
import { MarketResultsCards } from "@/features/market/components/MarketResultsCards"
import { MarketResultsTable } from "@/features/market/components/MarketResultsTable"
import { PaginationControls } from "@/features/market/components/PaginationControls"
import { SaveFilterDialog } from "@/features/market/components/SaveFilterDialog"
import { SavedFiltersPanel } from "@/features/market/components/SavedFiltersPanel"
import { ViewToggle } from "@/features/market/components/ViewToggle"
import { getSavedMarketFiltersAction, searchMarketAssetsAction } from "@/features/market/discovery-actions"
import {
  DEFAULT_MARKET_FILTERS,
  MARKET_SORT_LABELS,
  type MarketAssetRow,
  type MarketFilters,
  type MarketSortOption,
  type MarketView,
  type SavedMarketFilterSummary,
} from "@/features/market/discovery-types"

const VIEW_STORAGE_KEY = "mercado-view"
const MOBILE_QUERY = "(max-width: 639px)"

interface MarketDiscoveryBoardProps {
  sectors: string[]
  initialRows: MarketAssetRow[]
  initialTotalCount: number
  initialSavedFilters: SavedMarketFilterSummary[]
  isAuthenticated: boolean
}

/// Owns every piece of /mercado's interactive state (filters, sort, page,
/// view) and re-fetches via a Server Action on every change — the same
/// client-driven-refetch pattern already used for Radar's AI summary and
/// Carteira's patrimony-period switch, chosen here over URL search params
/// because the filter surface is much larger and every edit already gets
/// debounced inside MarketFilterBar.
export function MarketDiscoveryBoard({
  sectors,
  initialRows,
  initialTotalCount,
  initialSavedFilters,
  isAuthenticated,
}: MarketDiscoveryBoardProps) {
  const [filters, setFilters] = useState<MarketFilters>(DEFAULT_MARKET_FILTERS)
  const [sort, setSort] = useState<MarketSortOption>("relevancia")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [filterBarKey, setFilterBarKey] = useState(0)
  const [view, setView] = useState<MarketView>("table")

  const [rows, setRows] = useState<MarketAssetRow[]>(initialRows)
  const [totalCount, setTotalCount] = useState(initialTotalCount)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [savedFilters, setSavedFilters] = useState(initialSavedFilters)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)

  // Reads the browser's real viewport/localStorage once after mount — a
  // genuine external-system read (not derivable from props/state), so it
  // belongs in an effect; SSR and the first client render both show
  // "table" to avoid a hydration mismatch, correcting right after.
  // Genuinely reading an external system (viewport + localStorage) once on
  // mount, not deriving from props/state — SSR and the first client render
  // both show "table", so this can only correct the view right after, never
  // cause a visible mismatch.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const isMobile = window.matchMedia(MOBILE_QUERY).matches
    if (isMobile) {
      setView("cards")
      return
    }
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY)
    if (stored === "table" || stored === "cards") setView(stored)
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  // The server already fetched exactly this state (default filters,
  // "relevancia", page 1) for the initial render — skip the mount-time run
  // so the client never re-issues a query the server just made.
  const isFirstRun = useRef(true)
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false
      return
    }
    startTransition(async () => {
      try {
        const result = await searchMarketAssetsAction(filters, sort, page, pageSize)
        setRows(result.rows)
        setTotalCount(result.totalCount)
        setError(null)
      } catch {
        setError("Não foi possível carregar os ativos agora. Tente novamente em instantes.")
      }
    })
  }, [filters, sort, page, pageSize])

  function updateFilters(next: MarketFilters, resetBar: boolean) {
    setFilters(next)
    setPage(1)
    if (resetBar) setFilterBarKey((key) => key + 1)
  }

  function handleViewChange(next: MarketView) {
    setView(next)
    if (!window.matchMedia(MOBILE_QUERY).matches) {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next)
    }
  }

  async function refreshSavedFilters() {
    setSavedFilters(await getSavedMarketFiltersAction())
  }

  return (
    <div className="space-y-5">
      <CategoryChips value={filters.categoria} onChange={(categoria) => updateFilters({ ...filters, categoria }, true)} />

      <MarketFilterBar
        key={filterBarKey}
        filters={filters}
        sectors={sectors}
        onChange={(next) => updateFilters(next, false)}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={sort} onValueChange={(v) => setSort(v as MarketSortOption)}>
            <SelectTrigger size="sm" className="w-56">
              {/* Base UI's Select.Value shows the raw value string unless
                  told how to format it — map it back to the label. */}
              <SelectValue>{(value: MarketSortOption) => MARKET_SORT_LABELS[value]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(MARKET_SORT_LABELS) as MarketSortOption[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {MARKET_SORT_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isAuthenticated && (
            <Button variant="outline" size="sm" onClick={() => setSaveDialogOpen(true)}>
              <Bookmark className="size-4" />
              Salvar filtro
            </Button>
          )}
        </div>
        <ViewToggle value={view} onChange={handleViewChange} />
      </div>

      {isAuthenticated && (
        <SavedFiltersPanel
          savedFilters={savedFilters}
          onApply={(savedFilters_, savedSort) => {
            updateFilters(savedFilters_, true)
            setSort(savedSort)
          }}
          onDeleted={(id) => setSavedFilters((current) => current.filter((f) => f.id !== id))}
        />
      )}

      <ActiveFiltersPanel filters={filters} onChange={(next) => updateFilters(next, true)} />

      {error ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-loss/40 py-16 text-center">
          <AlertTriangle className="size-8 text-loss" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      ) : isPending && rows.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <SearchX className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum ativo encontrado com esses filtros.</p>
          <Button variant="outline" size="sm" onClick={() => updateFilters(DEFAULT_MARKET_FILTERS, true)}>
            Limpar filtros
          </Button>
        </div>
      ) : (
        <div className={isPending ? "opacity-60 transition-opacity" : "transition-opacity"}>
          {view === "table" ? <MarketResultsTable rows={rows} /> : <MarketResultsCards rows={rows} />}
        </div>
      )}

      {!error && (
        <PaginationControls
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
        />
      )}

      <SaveFilterDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        filters={filters}
        sort={sort}
        onSaved={refreshSavedFilters}
      />
    </div>
  )
}
