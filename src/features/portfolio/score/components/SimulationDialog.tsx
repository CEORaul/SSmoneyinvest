"use client"

import { Minus, Plus, RefreshCw } from "lucide-react"
import { useMemo, useState } from "react"

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AssetSearchCombobox } from "@/features/comparator/components/AssetSearchCombobox"
import { computePortfolioScore } from "@/features/portfolio/score/compute-score"
import { applySimulatedChanges, type SimulatedChange } from "@/features/portfolio/score/simulate"
import type { PortfolioScoreResult } from "@/features/portfolio/score/types"
import type { CompanySearchResult, PortfolioSummary } from "@/features/portfolio/queries"
import { cn } from "@/lib/utils"
import { formatCurrencyCents } from "@/utils/format"

interface SimulationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  summary: PortfolioSummary
  currentResult: PortfolioScoreResult
}

type ActionTab = "ADD" | "REMOVE" | "ADJUST"

function toCents(input: string): number | null {
  const parsed = Number(input.replace(",", "."))
  return input.trim() === "" || Number.isNaN(parsed) || parsed <= 0 ? null : Math.round(parsed * 100)
}

function tickerFor(companyId: string, summary: PortfolioSummary): string {
  return summary.positions.find((p) => p.companyId === companyId)?.ticker ?? "Selecione um ativo"
}

function describeChange(change: SimulatedChange, summary: PortfolioSummary): string {
  if (change.type === "ADD") return `+ ${change.ticker} (${formatCurrencyCents(change.valueCents)})`
  if (change.type === "REMOVE") return `- ${tickerFor(change.companyId, summary)}`
  return `${tickerFor(change.companyId, summary)} → ${formatCurrencyCents(change.newValueCents)}`
}

/// Everything here runs entirely client-side — applySimulatedChanges and
/// computePortfolioScore are pure functions with zero Prisma access, so a
/// what-if never touches the database and never risks altering the user's
/// real positions/transactions. "Limpar simulação" just clears local state.
export function SimulationDialog({ open, onOpenChange, summary, currentResult }: SimulationDialogProps) {
  const [changes, setChanges] = useState<SimulatedChange[]>([])
  const [tab, setTab] = useState<ActionTab>("ADD")
  const [selectedCompany, setSelectedCompany] = useState<CompanySearchResult | null>(null)
  const [valueInput, setValueInput] = useState("")
  const [removeCompanyId, setRemoveCompanyId] = useState("")
  const [adjustCompanyId, setAdjustCompanyId] = useState("")
  const [adjustValueInput, setAdjustValueInput] = useState("")

  const simulatedSummary = useMemo(() => applySimulatedChanges(summary, changes), [summary, changes])
  const simulatedResult = useMemo(() => computePortfolioScore(simulatedSummary), [simulatedSummary])

  function reset() {
    setChanges([])
    setSelectedCompany(null)
    setValueInput("")
    setRemoveCompanyId("")
    setAdjustCompanyId("")
    setAdjustValueInput("")
  }

  function handleAdd() {
    if (!selectedCompany) return
    const valueCents = toCents(valueInput)
    if (!valueCents) return
    setChanges((current) => [
      ...current,
      {
        type: "ADD",
        companyId: selectedCompany.id,
        ticker: selectedCompany.ticker,
        name: selectedCompany.name,
        logoUrl: selectedCompany.logoUrl,
        // The search result doesn't carry sector — a simulated addition is
        // honestly treated as "sem setor conhecido" rather than guessing one.
        sector: null,
        assetClass: selectedCompany.assetClass,
        priceSource: selectedCompany.priceSource,
        priceCents: selectedCompany.priceCents,
        valueCents,
      },
    ])
    setSelectedCompany(null)
    setValueInput("")
  }

  function handleRemove() {
    if (!removeCompanyId) return
    setChanges((current) => [...current, { type: "REMOVE", companyId: removeCompanyId }])
    setRemoveCompanyId("")
  }

  function handleAdjust() {
    if (!adjustCompanyId) return
    const valueCents = toCents(adjustValueInput)
    if (valueCents == null) return
    setChanges((current) => [...current, { type: "ADJUST", companyId: adjustCompanyId, newValueCents: valueCents }])
    setAdjustCompanyId("")
    setAdjustValueInput("")
  }

  const scoreDelta = simulatedResult ? simulatedResult.score - currentResult.score : null

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Simular mudanças</DialogTitle>
          <DialogDescription>Veja como o Score mudaria — nada aqui altera sua carteira real.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-6 rounded-lg bg-muted/50 p-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Score atual</p>
            <p className="text-2xl font-bold tabular-nums">{currentResult.score}</p>
          </div>
          <RefreshCw className="size-4 text-muted-foreground" />
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Score simulado</p>
            <p
              className={cn(
                "text-2xl font-bold tabular-nums",
                scoreDelta != null && scoreDelta !== 0 ? (scoreDelta > 0 ? "text-gain" : "text-loss") : ""
              )}
            >
              {simulatedResult ? simulatedResult.score : "—"}
            </p>
          </div>
        </div>

        <div className="flex gap-1 rounded-lg bg-muted p-0.5">
          <Button variant={tab === "ADD" ? "default" : "ghost"} size="sm" className="flex-1" onClick={() => setTab("ADD")}>
            Adicionar
          </Button>
          <Button variant={tab === "REMOVE" ? "default" : "ghost"} size="sm" className="flex-1" onClick={() => setTab("REMOVE")}>
            Remover
          </Button>
          <Button variant={tab === "ADJUST" ? "default" : "ghost"} size="sm" className="flex-1" onClick={() => setTab("ADJUST")}>
            Alterar valor
          </Button>
        </div>

        {tab === "ADD" && (
          <div className="space-y-2">
            {selectedCompany ? (
              <div className="flex items-center justify-between rounded-lg border border-border p-2 text-sm">
                <span>{selectedCompany.ticker}</span>
                <Button variant="ghost" size="sm" onClick={() => setSelectedCompany(null)}>
                  Trocar
                </Button>
              </div>
            ) : (
              <AssetSearchCombobox onSelect={setSelectedCompany} />
            )}
            <div className="flex gap-2">
              <Input
                type="number"
                min={0}
                placeholder="Valor (R$)"
                value={valueInput}
                onChange={(e) => setValueInput(e.target.value)}
              />
              <Button onClick={handleAdd} disabled={!selectedCompany}>
                <Plus className="size-4" />
                Adicionar
              </Button>
            </div>
          </div>
        )}

        {tab === "REMOVE" && (
          <div className="flex gap-2">
            <Select value={removeCompanyId} onValueChange={(value) => setRemoveCompanyId(value ?? "")}>
              <SelectTrigger className="flex-1">
                <SelectValue>{(value: string) => tickerFor(value, summary)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {summary.positions.map((p) => (
                  <SelectItem key={p.companyId} value={p.companyId}>
                    {p.ticker}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleRemove} disabled={!removeCompanyId} variant="destructive">
              <Minus className="size-4" />
              Remover
            </Button>
          </div>
        )}

        {tab === "ADJUST" && (
          <div className="space-y-2">
            <Select value={adjustCompanyId} onValueChange={(value) => setAdjustCompanyId(value ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue>{(value: string) => tickerFor(value, summary)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {summary.positions.map((p) => (
                  <SelectItem key={p.companyId} value={p.companyId}>
                    {p.ticker} ({formatCurrencyCents(p.currentValueCents)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                type="number"
                min={0}
                placeholder="Novo valor (R$)"
                value={adjustValueInput}
                onChange={(e) => setAdjustValueInput(e.target.value)}
              />
              <Button onClick={handleAdjust} disabled={!adjustCompanyId}>
                Aplicar
              </Button>
            </div>
          </div>
        )}

        {changes.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Mudanças simuladas</p>
            <div className="flex flex-wrap gap-1.5">
              {changes.map((change, index) => (
                <div key={index} className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs">
                  {describeChange(change, summary)}
                  <button
                    type="button"
                    onClick={() => setChanges((current) => current.filter((_, i) => i !== index))}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Remover esta mudança simulada"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={reset}>
            Limpar simulação
          </Button>
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
