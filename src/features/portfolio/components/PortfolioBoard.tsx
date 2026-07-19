"use client"

import { Search } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { AdjustmentDialog } from "@/features/portfolio/components/AdjustmentDialog"
import {
  CategorySection,
  type PositionActionType,
} from "@/features/portfolio/components/CategorySection"
import { IncomeDialog } from "@/features/portfolio/components/IncomeDialog"
import { TradeDialog, type TradeCompany } from "@/features/portfolio/components/TradeDialog"
import { TransactionHistoryDialog } from "@/features/portfolio/components/TransactionHistoryDialog"
import { removePositionAction } from "@/features/portfolio/actions"
import type { PortfolioCategoryGroup, PortfolioPositionRow } from "@/features/portfolio/queries"

interface PortfolioBoardProps {
  byCategory: PortfolioCategoryGroup[]
}

/// Owns the search box, the shared action-dialog state (one set of dialogs
/// reused across every CategorySection, same pattern as the old flat
/// table), and the remove-position confirmation — everything a single
/// category card shouldn't have to know about on its own.
export function PortfolioBoard({ byCategory }: PortfolioBoardProps) {
  const [search, setSearch] = useState("")
  const [activeAction, setActiveAction] = useState<{
    type: PositionActionType
    position: PortfolioPositionRow
  } | null>(null)
  const [removingPosition, setRemovingPosition] = useState<PortfolioPositionRow | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  const query = search.trim().toLowerCase()
  const filteredGroups = useMemo(() => {
    if (!query) return byCategory
    return byCategory
      .map((group) => ({
        ...group,
        positions: group.positions.filter(
          (position) =>
            position.ticker.toLowerCase().includes(query) ||
            position.name.toLowerCase().includes(query)
        ),
      }))
      .filter((group) => group.positions.length > 0)
  }, [byCategory, query])

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
        isManualEntry: activeAction.position.isManualEntry,
      }
    : null

  return (
    <div className="space-y-4">
      <div className="relative max-w-xs">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por ticker ou nome"
          className="pl-9"
        />
      </div>

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
