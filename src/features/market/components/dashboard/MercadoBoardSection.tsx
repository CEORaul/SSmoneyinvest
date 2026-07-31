"use client"

import { useRef, useState } from "react"

import { MarketDiscoveryBoard } from "@/features/market/components/MarketDiscoveryBoard"
import { MarketQuickFilters } from "@/features/market/components/dashboard/MarketQuickFilters"
import { DEFAULT_MARKET_FILTERS, type MarketAssetRow, type MarketFilters, type SavedMarketFilterSummary } from "@/features/market/discovery-types"

interface MercadoBoardSectionProps {
  sectors: string[]
  initialRows: MarketAssetRow[]
  initialTotalCount: number
  initialSavedFilters: SavedMarketFilterSummary[]
  isAuthenticated: boolean
}

/// Wires Mercado 2.0's quick filters into the existing (unmodified)
/// MarketDiscoveryBoard via the initialFilters/skipInitialFetch/key-remount
/// extension added for this phase — the board's own internal filter UI
/// (CategoryChips, MarketFilterBar, saved filters, table/cards, AI button)
/// keeps working completely unchanged underneath a quick filter selection,
/// since a remount just re-seeds its starting state.
export function MercadoBoardSection({
  sectors,
  initialRows,
  initialTotalCount,
  initialSavedFilters,
  isAuthenticated,
}: MercadoBoardSectionProps) {
  const [activeId, setActiveId] = useState("todos")
  const [selectedFilters, setSelectedFilters] = useState<MarketFilters>(DEFAULT_MARKET_FILTERS)
  const remountKey = useRef(0)
  const [key, setKey] = useState(0)
  const boardRef = useRef<HTMLDivElement>(null)

  function handleSelect(id: string, filters: MarketFilters) {
    setActiveId(id)
    setSelectedFilters(filters)
    remountKey.current += 1
    setKey(remountKey.current)
    boardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <div ref={boardRef} className="space-y-5">
      <MarketQuickFilters activeId={activeId} isAuthenticated={isAuthenticated} onSelect={handleSelect} />

      <MarketDiscoveryBoard
        key={key}
        sectors={sectors}
        initialRows={key === 0 ? initialRows : []}
        initialTotalCount={key === 0 ? initialTotalCount : 0}
        initialSavedFilters={initialSavedFilters}
        isAuthenticated={isAuthenticated}
        initialFilters={selectedFilters}
        skipInitialFetch={key === 0}
      />
    </div>
  )
}
