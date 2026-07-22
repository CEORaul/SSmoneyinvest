"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AdjustmentDialog } from "@/features/portfolio/components/AdjustmentDialog"
import {
  CategorySection,
  type PositionActionType,
} from "@/features/portfolio/components/CategorySection"
import { FilterBar, type PortfolioFilters, type SortOption } from "@/features/portfolio/components/FilterBar"
import type { SparklinePoint } from "@/features/portfolio/components/Sparkline"
import { IncomeDialog } from "@/features/portfolio/components/IncomeDialog"
import { TradeDialog, type TradeCompany } from "@/features/portfolio/components/TradeDialog"
import { TransactionHistoryDialog } from "@/features/portfolio/components/TransactionHistoryDialog"
import { removePositionAction } from "@/features/portfolio/actions"
import { getAssetCategoryMeta } from "@/features/portfolio/asset-category"
import type { SortKey } from "@/features/portfolio/sort-positions"
import type { AssetClass } from "@/generated/prisma/client"
import type { PortfolioCategoryGroup, PortfolioPositionRow } from "@/features/portfolio/queries"

interface PortfolioBoardProps {
  byCategory: PortfolioCategoryGroup[]
  /// Batched once for the whole page (see /carteira's page.tsx) — never
  /// refetched per row. Categories with no market-data provider simply have
  /// no entry here, which Sparkline renders as an honest flat dash.
  priceHistories: { companyId: string; points: SparklinePoint[] }[]
  monthlyChangeByCompany: { companyId: string; changePct: number }[]
}

const ORDENAR_TO_SORT: Record<Exclude<SortOption, "">, { key: SortKey; direction: "asc" | "desc" }> = {
  alfabetica: { key: "ticker", direction: "asc" },
  "maior-rentabilidade": { key: "profit", direction: "desc" },
  "maior-prejuizo": { key: "profit", direction: "asc" },
  "maior-participacao": { key: "allocation", direction: "desc" },
  "maior-patrimonio": { key: "value", direction: "desc" },
  "menor-patrimonio": { key: "value", direction: "asc" },
}

function readFiltersFromSearchParams(params: URLSearchParams): PortfolioFilters {
  return {
    search: params.get("q") ?? "",
    categoria: (params.get("categoria") as AssetClass | null) ?? "",
    setor: params.get("setor") ?? "",
    dividendos: params.get("dividendos") === "1",
    posicao: (params.get("posicao") as PortfolioFilters["posicao"] | null) ?? "",
    ordenar: (params.get("ordenar") as SortOption | null) ?? "",
  }
}

function filtersToSearchParams(filters: PortfolioFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.search) params.set("q", filters.search)
  if (filters.categoria) params.set("categoria", filters.categoria)
  if (filters.setor) params.set("setor", filters.setor)
  if (filters.dividendos) params.set("dividendos", "1")
  if (filters.posicao) params.set("posicao", filters.posicao)
  if (filters.ordenar) params.set("ordenar", filters.ordenar)
  return params
}

/// Owns the filter bar's state (synced to the URL's search params — every
/// filter/sort combination is a shareable, bookmarkable link, per the
/// "Server Components + URL Search Params" requirement), the shared
/// action-dialog state (one set of dialogs reused across every
/// CategorySection), and the remove-position confirmation.
export function PortfolioBoard({ byCategory, priceHistories, monthlyChangeByCompany }: PortfolioBoardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [filters, setFilters] = useState<PortfolioFilters>(() =>
    readFiltersFromSearchParams(searchParams)
  )
  const [activeAction, setActiveAction] = useState<{
    type: PositionActionType
    position: PortfolioPositionRow
  } | null>(null)
  const [removingPosition, setRemovingPosition] = useState<PortfolioPositionRow | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  useEffect(() => {
    const query = filtersToSearchParams(filters).toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [filters, pathname, router])

  const priceHistoryMap = useMemo(
    () => new Map(priceHistories.map((p) => [p.companyId, p.points])),
    [priceHistories]
  )
  const monthlyChangeMap = useMemo(
    () => new Map(monthlyChangeByCompany.map((m) => [m.companyId, m.changePct])),
    [monthlyChangeByCompany]
  )

  const categoryOptions = useMemo(
    () => byCategory.map((g) => ({ value: g.category, label: getAssetCategoryMeta(g.category).label })),
    [byCategory]
  )
  const sectorOptions = useMemo(() => {
    const sectors = new Set<string>()
    for (const group of byCategory) {
      for (const position of group.positions) {
        if (position.sector) sectors.add(position.sector)
      }
    }
    return [...sectors].sort()
  }, [byCategory])

  const query = filters.search.trim().toLowerCase()
  const filteredGroups = useMemo(() => {
    return byCategory
      .filter((group) => !filters.categoria || group.category === filters.categoria)
      .map((group) => ({
        ...group,
        positions: group.positions.filter((position) => {
          if (query && !position.ticker.toLowerCase().includes(query) && !position.name.toLowerCase().includes(query)) {
            return false
          }
          if (filters.setor && position.sector !== filters.setor) return false
          if (filters.dividendos && position.dividendYieldPct <= 0) return false
          if (filters.posicao === "positiva" && position.profitCents < 0) return false
          if (filters.posicao === "negativa" && position.profitCents >= 0) return false
          return true
        }),
      }))
      .filter((group) => group.positions.length > 0)
  }, [byCategory, query, filters.categoria, filters.setor, filters.dividendos, filters.posicao])

  const sortOverride = filters.ordenar ? ORDENAR_TO_SORT[filters.ordenar] : undefined

  async function handleRemove() {
    if (!removingPosition) return
    setIsRemoving(true)
    const result = await removePositionAction(removingPosition.companyId)
    setIsRemoving(false)

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível remover o ativo")
      return
    }

    toast.success(`${removingPosition.ticker} removido da carteira`)
    setRemovingPosition(null)
  }

  const activeCompany: TradeCompany | null = activeAction
    ? {
        id: activeAction.position.companyId,
        ticker: activeAction.position.ticker,
        name: activeAction.position.name,
        logoUrl: activeAction.position.logoUrl,
        assetClass: activeAction.position.assetClass,
        priceSource: activeAction.position.priceSource,
      }
    : null

  return (
    <div className="space-y-4">
      <FilterBar filters={filters} onChange={setFilters} categories={categoryOptions} sectors={sectorOptions} />

      {filteredGroups.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhum ativo encontrado.</p>
      ) : (
        <div className="space-y-3">
          {filteredGroups.map((group) => (
            <CategorySection
              key={group.category}
              group={group}
              onAction={(type, position) => setActiveAction({ type, position })}
              onRemove={setRemovingPosition}
              sortOverride={sortOverride}
              priceHistories={priceHistoryMap}
              monthlyChangeByCompany={monthlyChangeMap}
            />
          ))}
        </div>
      )}

      {activeCompany && (
        <>
          <TradeDialog
            type="BUY"
            company={activeCompany}
            ownedQuantity={activeAction?.position.quantity}
            open={activeAction?.type === "buy"}
            onOpenChange={(open) => !open && setActiveAction(null)}
          />
          <TradeDialog
            type="SELL"
            company={activeCompany}
            ownedQuantity={activeAction?.position.quantity}
            open={activeAction?.type === "sell"}
            onOpenChange={(open) => !open && setActiveAction(null)}
          />
          <IncomeDialog
            companyId={activeCompany.id}
            ticker={activeCompany.ticker}
            open={activeAction?.type === "income"}
            onOpenChange={(open) => !open && setActiveAction(null)}
          />
          <AdjustmentDialog
            companyId={activeCompany.id}
            ticker={activeCompany.ticker}
            open={activeAction?.type === "adjustment"}
            onOpenChange={(open) => !open && setActiveAction(null)}
          />
          <TransactionHistoryDialog
            companyId={activeCompany.id}
            ticker={activeCompany.ticker}
            open={activeAction?.type === "history"}
            onOpenChange={(open) => !open && setActiveAction(null)}
          />
        </>
      )}

      <Dialog open={!!removingPosition} onOpenChange={(open) => !open && setRemovingPosition(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir {removingPosition?.ticker} da carteira?</DialogTitle>
            <DialogDescription>
              Isso exclui permanentemente todo o histórico de operações deste ativo. Essa ação não
              pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemovingPosition(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleRemove} loading={isRemoving}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
