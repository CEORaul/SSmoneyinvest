"use client"

import { Loader2, Search, TrendingUp } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"

import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { PriceChangeTag } from "@/components/shared/PriceChangeTag"
import { TickerBadge } from "@/components/shared/TickerBadge"
import { translateSector } from "@/features/company/sector-labels"
import { getAssetCategoryMeta, ASSET_CATEGORIES } from "@/features/portfolio/asset-category"
import {
  getSearchDropdownDefaultsAction,
  logSearchSelectionAction,
  searchAssetsAction,
  type SearchDropdownDefaults,
} from "@/features/search/actions"
import type { GlobalSearchResult } from "@/features/search/queries"
import {
  addLocalRecentSearch,
  getLocalRecentSearches,
  getLocalRecentViews,
  type LocalHistoryItem,
} from "@/features/search/local-history"
import { cn } from "@/lib/utils"
import { formatCurrencyCents } from "@/utils/format"
import type { CompanyListItem } from "@/types"

const SEARCH_DEBOUNCE_MS = 250

/// The view layer's common row shape — satisfied by GlobalSearchResult
/// (server search/trending/favorites/portfolio) and LocalHistoryItem
/// (anonymous visitor's localStorage history) alike. `sector` is the only
/// field the latter doesn't carry, so it's optional here rather than
/// fabricated.
type SearchRowData = Omit<GlobalSearchResult, "sector"> & { sector?: string | null }

interface FlatItem {
  key: string
  ticker: string
  select: () => void
}

interface GlobalSearchProps {
  variant: "inline" | "modal"
  isAuthenticated: boolean
  initialDefaults?: SearchDropdownDefaults
  placeholder?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const POPULAR_TABS = [
  { key: "gainers", label: "Maior valorização" },
  { key: "dividendYield", label: "Maior Dividend Yield" },
  { key: "volume", label: "Maior volume" },
] as const
type PopularTabKey = (typeof POPULAR_TABS)[number]["key"]

export function GlobalSearch(props: GlobalSearchProps) {
  if (props.variant === "modal") {
    return <GlobalSearchModal {...props} />
  }
  return <GlobalSearchInline {...props} />
}

function GlobalSearchInline(props: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative mx-auto w-full max-w-lg">
      <GlobalSearchCore
        {...props}
        panelOpen={isOpen}
        onPanelOpenChange={setIsOpen}
        inputClassName="mx-auto flex w-full items-center gap-2 rounded-full border border-border bg-card p-1.5 shadow-sm transition-shadow focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10"
        panelClassName="absolute inset-x-0 top-full z-40 mt-2 max-h-[28rem] overflow-y-auto rounded-2xl border border-border bg-popover p-2 shadow-lg"
      />
    </div>
  )
}

function GlobalSearchModal({ open, onOpenChange, ...props }: GlobalSearchProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-24 max-w-xl translate-y-0 gap-0 p-0 sm:max-w-xl" showCloseButton={false}>
        <DialogTitle className="sr-only">Busca global</DialogTitle>
        <GlobalSearchCore
          {...props}
          panelOpen
          onPanelOpenChange={() => {}}
          autoFocus
          onSelectNavigate={() => onOpenChange?.(false)}
          inputClassName="flex w-full items-center gap-2 border-b border-border px-4 py-3"
          panelClassName="max-h-[28rem] overflow-y-auto p-2"
        />
      </DialogContent>
    </Dialog>
  )
}

interface GlobalSearchCoreProps extends GlobalSearchProps {
  panelOpen: boolean
  onPanelOpenChange: (open: boolean) => void
  inputClassName: string
  panelClassName: string
  autoFocus?: boolean
  onSelectNavigate?: () => void
}

function GlobalSearchCore({
  isAuthenticated,
  initialDefaults,
  placeholder,
  panelOpen,
  onPanelOpenChange,
  inputClassName,
  panelClassName,
  autoFocus,
  onSelectNavigate,
}: GlobalSearchCoreProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState("")
  const [defaults, setDefaults] = useState<SearchDropdownDefaults | null>(initialDefaults ?? null)
  const [isLoadingDefaults, setIsLoadingDefaults] = useState(false)
  const [liveResults, setLiveResults] = useState<GlobalSearchResult[] | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null)
  const [popularTab, setPopularTab] = useState<PopularTabKey>("gainers")
  const [localSearches, setLocalSearches] = useState<LocalHistoryItem[]>([])
  const [localViews, setLocalViews] = useState<LocalHistoryItem[]>([])

  const isShowingDefaults = query.trim().length === 0

  // Loads the empty-state content the first time the panel actually opens
  // (the modal variant has no server-rendered initial paint to seed this
  // with, unlike the Hero's inline variant which passes initialDefaults).
  useEffect(() => {
    if (!panelOpen || defaults || isLoadingDefaults) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingDefaults(true)
    getSearchDropdownDefaultsAction().then((result) => {
      setDefaults(result)
      setIsLoadingDefaults(false)
    })
  }, [panelOpen, defaults, isLoadingDefaults])

  useEffect(() => {
    if (!panelOpen || isAuthenticated) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalSearches(getLocalRecentSearches())
    setLocalViews(getLocalRecentViews())
  }, [panelOpen, isAuthenticated])

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    if (isShowingDefaults) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLiveResults(null)
      return
    }
    setIsSearching(true)
    const timeout = setTimeout(() => {
      searchAssetsAction(query).then((results) => {
        setLiveResults(results)
        setIsSearching(false)
      })
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [query, isShowingDefaults])

  function handleSelect(item: SearchRowData, sourceQuery: string) {
    if (!isAuthenticated) {
      addLocalRecentSearch({
        id: item.id,
        ticker: item.ticker,
        name: item.name,
        logoUrl: item.logoUrl,
        assetClass: item.assetClass,
        priceCents: item.priceCents,
        changePct: item.changePct,
      })
    }
    if (item.id) {
      logSearchSelectionAction(item.id, sourceQuery || item.ticker)
    }
    setQuery("")
    onPanelOpenChange(false)
    onSelectNavigate?.()
    router.push(`/empresa/${item.ticker}`)
  }

  function handleSelectCompact(item: CompanyListItem) {
    setQuery("")
    onPanelOpenChange(false)
    onSelectNavigate?.()
    router.push(`/empresa/${item.ticker}`)
  }

  // Every currently visible, keyboard-navigable row — in exact visual
  // order — so ArrowUp/ArrowDown/Enter never depend on knowing which
  // section produced a given row.
  const flatItems = useMemo<FlatItem[]>(() => {
    if (!isShowingDefaults) {
      return (liveResults ?? []).map((result) => ({
        key: `live-${result.id}`,
        ticker: result.ticker,
        select: () => handleSelect(result, query),
      }))
    }

    const items: FlatItem[] = []
    const recentSearches = isAuthenticated ? (defaults?.recentSearches ?? []) : localSearches
    const recentViews = isAuthenticated ? (defaults?.recentViews ?? []) : localViews

    for (const row of recentSearches) {
      items.push({ key: `rs-${row.ticker}`, ticker: row.ticker, select: () => handleSelect(row, row.ticker) })
    }
    for (const row of recentViews) {
      items.push({ key: `rv-${row.ticker}`, ticker: row.ticker, select: () => handleSelect(row, row.ticker) })
    }
    for (const row of defaults?.favorites ?? []) {
      items.push({ key: `fav-${row.ticker}`, ticker: row.ticker, select: () => handleSelect(row, row.ticker) })
    }
    for (const row of defaults?.portfolio ?? []) {
      items.push({ key: `port-${row.ticker}`, ticker: row.ticker, select: () => handleSelect(row, row.ticker) })
    }
    for (const row of defaults?.trending ?? []) {
      items.push({ key: `trend-${row.ticker}`, ticker: row.ticker, select: () => handleSelect(row, row.ticker) })
    }
    const popularList =
      popularTab === "dividendYield"
        ? (defaults?.popularDividendPayers ?? [])
        : popularTab === "volume"
          ? (defaults?.popularByVolume ?? [])
          : (defaults?.popularGainers ?? [])
    for (const row of popularList) {
      items.push({ key: `pop-${row.ticker}`, ticker: row.ticker, select: () => handleSelectCompact(row) })
    }
    return items
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isShowingDefaults, liveResults, defaults, isAuthenticated, localSearches, localViews, popularTab, query])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHighlightedKey(flatItems[0]?.key ?? null)
  }, [flatItems])

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      const currentIndex = flatItems.findIndex((item) => item.key === highlightedKey)
      const next = flatItems[Math.min(currentIndex + 1, flatItems.length - 1)]
      if (next) setHighlightedKey(next.key)
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      const currentIndex = flatItems.findIndex((item) => item.key === highlightedKey)
      const prev = flatItems[Math.max(currentIndex - 1, 0)]
      if (prev) setHighlightedKey(prev.key)
    } else if (event.key === "Enter") {
      event.preventDefault()
      const current = flatItems.find((item) => item.key === highlightedKey) ?? flatItems[0]
      current?.select()
    } else if (event.key === "Escape") {
      onPanelOpenChange(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div className="w-full">
      <div className={inputClassName}>
        <Search className="ml-3 size-4 shrink-0 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => onPanelOpenChange(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? "Buscar ação, FII, ETF, cripto... (ex: PETR4)"}
          aria-label="Buscar ativo"
          className="border-none bg-transparent shadow-none outline-none focus-visible:ring-0"
        />
        {isSearching && <Loader2 className="mr-3 size-4 shrink-0 animate-spin text-muted-foreground" />}
      </div>

      {panelOpen && (
        <div className={panelClassName}>
          {isShowingDefaults ? (
            <DefaultsPanel
              isLoading={isLoadingDefaults}
              isAuthenticated={isAuthenticated}
              defaults={defaults}
              recentSearches={isAuthenticated ? (defaults?.recentSearches ?? []) : localSearches}
              recentViews={isAuthenticated ? (defaults?.recentViews ?? []) : localViews}
              highlightedKey={highlightedKey}
              onHighlight={setHighlightedKey}
              onSelect={(row) => handleSelect(row, row.ticker)}
              popularTab={popularTab}
              onPopularTabChange={setPopularTab}
              onSelectCompact={handleSelectCompact}
            />
          ) : (
            <LiveResultsPanel
              query={query}
              results={liveResults}
              isSearching={isSearching}
              highlightedKey={highlightedKey}
              onHighlight={setHighlightedKey}
              onSelect={(row) => handleSelect(row, query)}
            />
          )}
        </div>
      )}
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase first:pt-1">{children}</p>
  )
}

function ResultRow({
  row,
  highlighted,
  onHighlight,
  onSelect,
}: {
  row: SearchRowData
  highlighted: boolean
  onHighlight: () => void
  onSelect: () => void
}) {
  const meta = getAssetCategoryMeta(row.assetClass)
  return (
    <button
      type="button"
      onMouseEnter={onHighlight}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left",
        highlighted && "bg-accent"
      )}
    >
      <TickerBadge ticker={row.ticker} logoUrl={row.logoUrl} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{row.ticker}</p>
          <Badge variant="outline" className="shrink-0">
            {meta.emoji} {meta.label}
          </Badge>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {row.name}
          {row.sector ? ` · ${translateSector(row.sector)}` : ""}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-medium tabular-nums">{formatCurrencyCents(row.priceCents)}</p>
        <PriceChangeTag changePct={row.changePct} className="justify-end text-xs" />
      </div>
    </button>
  )
}

function CompactRow({
  item,
  highlighted,
  onHighlight,
  onSelect,
}: {
  item: CompanyListItem
  highlighted: boolean
  onHighlight: () => void
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onMouseEnter={onHighlight}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left",
        highlighted && "bg-accent"
      )}
    >
      <TickerBadge ticker={item.ticker} logoUrl={item.logoUrl} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.ticker}</p>
        <p className="truncate text-xs text-muted-foreground">{item.name}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-medium tabular-nums">{formatCurrencyCents(item.priceCents)}</p>
        <PriceChangeTag changePct={item.changePct} className="justify-end text-xs" />
      </div>
    </button>
  )
}

function DefaultsPanel({
  isLoading,
  isAuthenticated,
  defaults,
  recentSearches,
  recentViews,
  highlightedKey,
  onHighlight,
  onSelect,
  popularTab,
  onPopularTabChange,
  onSelectCompact,
}: {
  isLoading: boolean
  isAuthenticated: boolean
  defaults: SearchDropdownDefaults | null
  recentSearches: SearchRowData[]
  recentViews: SearchRowData[]
  highlightedKey: string | null
  onHighlight: (key: string) => void
  onSelect: (row: SearchRowData) => void
  popularTab: PopularTabKey
  onPopularTabChange: (tab: PopularTabKey) => void
  onSelectCompact: (item: CompanyListItem) => void
}) {
  if (isLoading && !defaults) {
    return <p className="p-4 text-center text-sm text-muted-foreground">Carregando...</p>
  }

  const favorites = defaults?.favorites ?? []
  const portfolio = defaults?.portfolio ?? []
  const trending = defaults?.trending ?? []
  const popularList =
    popularTab === "dividendYield"
      ? (defaults?.popularDividendPayers ?? [])
      : popularTab === "volume"
        ? (defaults?.popularByVolume ?? [])
        : (defaults?.popularGainers ?? [])

  const hasAnything =
    recentSearches.length > 0 ||
    recentViews.length > 0 ||
    favorites.length > 0 ||
    portfolio.length > 0 ||
    trending.length > 0 ||
    popularList.length > 0

  if (!hasAnything) {
    return (
      <p className="p-4 text-center text-sm text-muted-foreground">
        Digite para buscar ações, FIIs, ETFs, criptomoedas e mais.
      </p>
    )
  }

  return (
    <div>
      {recentSearches.length > 0 && (
        <div>
          <SectionHeader>Últimas pesquisas</SectionHeader>
          {recentSearches.map((row) => (
            <ResultRow
              key={`rs-${row.ticker}`}
              row={row}
              highlighted={highlightedKey === `rs-${row.ticker}`}
              onHighlight={() => onHighlight(`rs-${row.ticker}`)}
              onSelect={() => onSelect(row)}
            />
          ))}
        </div>
      )}

      {recentViews.length > 0 && (
        <div>
          <SectionHeader>Últimos ativos vistos</SectionHeader>
          {recentViews.map((row) => (
            <ResultRow
              key={`rv-${row.ticker}`}
              row={row}
              highlighted={highlightedKey === `rv-${row.ticker}`}
              onHighlight={() => onHighlight(`rv-${row.ticker}`)}
              onSelect={() => onSelect(row)}
            />
          ))}
        </div>
      )}

      {isAuthenticated && favorites.length > 0 && (
        <div>
          <SectionHeader>Favoritos</SectionHeader>
          {favorites.map((row) => (
            <ResultRow
              key={`fav-${row.ticker}`}
              row={row}
              highlighted={highlightedKey === `fav-${row.ticker}`}
              onHighlight={() => onHighlight(`fav-${row.ticker}`)}
              onSelect={() => onSelect(row)}
            />
          ))}
        </div>
      )}

      {isAuthenticated && portfolio.length > 0 && (
        <div>
          <SectionHeader>Minha carteira</SectionHeader>
          {portfolio.map((row) => (
            <ResultRow
              key={`port-${row.ticker}`}
              row={row}
              highlighted={highlightedKey === `port-${row.ticker}`}
              onHighlight={() => onHighlight(`port-${row.ticker}`)}
              onSelect={() => onSelect(row)}
            />
          ))}
        </div>
      )}

      {trending.length > 0 && (
        <div>
          <SectionHeader>
            <span className="inline-flex items-center gap-1">
              <TrendingUp className="size-3" /> Tendências
            </span>
          </SectionHeader>
          {trending.map((row) => (
            <ResultRow
              key={`trend-${row.ticker}`}
              row={row}
              highlighted={highlightedKey === `trend-${row.ticker}`}
              onHighlight={() => onHighlight(`trend-${row.ticker}`)}
              onSelect={() => onSelect(row)}
            />
          ))}
        </div>
      )}

      {popularList.length > 0 && (
        <div>
          <SectionHeader>Populares</SectionHeader>
          <div className="flex gap-1 px-2 pb-2">
            {POPULAR_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => onPopularTabChange(tab.key)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  popularTab === tab.key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {popularList.map((item) => (
            <CompactRow
              key={`pop-${item.ticker}`}
              item={item}
              highlighted={highlightedKey === `pop-${item.ticker}`}
              onHighlight={() => onHighlight(`pop-${item.ticker}`)}
              onSelect={() => onSelectCompact(item)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function LiveResultsPanel({
  query,
  results,
  isSearching,
  highlightedKey,
  onHighlight,
  onSelect,
}: {
  query: string
  results: GlobalSearchResult[] | null
  isSearching: boolean
  highlightedKey: string | null
  onHighlight: (key: string) => void
  onSelect: (row: GlobalSearchResult) => void
}) {
  if (isSearching && results === null) {
    return <p className="p-4 text-center text-sm text-muted-foreground">Buscando...</p>
  }

  if (!results || results.length === 0) {
    return (
      <p className="p-4 text-center text-sm text-muted-foreground">
        Nenhum resultado para &ldquo;{query}&rdquo;.
      </p>
    )
  }

  const byCategory = new Map<string, GlobalSearchResult[]>()
  for (const result of results) {
    const list = byCategory.get(result.assetClass)
    if (list) list.push(result)
    else byCategory.set(result.assetClass, [result])
  }

  return (
    <div>
      {ASSET_CATEGORIES.filter((category) => byCategory.has(category.value)).map((category) => (
        <div key={category.value}>
          <SectionHeader>
            {category.emoji} {category.label}
          </SectionHeader>
          {byCategory.get(category.value)?.map((row) => (
            <ResultRow
              key={`live-${row.id}`}
              row={row}
              highlighted={highlightedKey === `live-${row.id}`}
              onHighlight={() => onHighlight(`live-${row.id}`)}
              onSelect={() => onSelect(row)}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
