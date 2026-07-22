"use client"

import { Settings2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { setTargetAllocationsAction } from "@/features/portfolio/actions"
import { ASSET_CATEGORIES } from "@/features/portfolio/asset-category"
import type { RebalancingRow } from "@/features/portfolio/rebalancing"
import { cn } from "@/lib/utils"
import { formatCurrencyCents, formatPercent } from "@/utils/format"

interface RebalancingSectionProps {
  rows: RebalancingRow[]
}

/// Rebalanceamento — current allocation % per category, and (only for
/// categories the user has configured a target for) how far off that target
/// they are, in both percentage points and R$. Categories with no target
/// just show the current bar, no comparison language.
export function RebalancingSection({ rows }: RebalancingSectionProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.filter((r) => r.targetPct != null).map((r) => [r.category, String(r.targetPct)]))
  )

  const sumDrafts = Object.values(drafts).reduce((sum, v) => sum + (Number(v) || 0), 0)

  async function handleSave() {
    const allocations = Object.entries(drafts)
      .map(([assetClass, value]) => ({ assetClass: assetClass as (typeof ASSET_CATEGORIES)[number]["value"], targetPct: Number(value) || 0 }))
      .filter((a) => a.targetPct > 0)

    setSaving(true)
    const result = await setTargetAllocationsAction({ allocations })
    setSaving(false)

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível salvar as metas.")
      return
    }
    toast.success("Metas de alocação atualizadas.")
    setOpen(false)
  }

  if (rows.length === 0) return null

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Rebalanceamento</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Settings2 className="size-4" />
          Configurar metas
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((row) => (
          <div key={row.category} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{row.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {formatPercent(row.currentPct)}
                {row.targetPct != null && <> / meta {formatPercent(row.targetPct)}</>}
              </span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width]"
                style={{ width: `${Math.min(100, row.currentPct)}%` }}
              />
              {row.targetPct != null && row.targetPct > 0 && (
                <div
                  className="absolute inset-y-0 w-0.5 bg-foreground/60"
                  style={{ left: `${Math.min(100, row.targetPct)}%` }}
                />
              )}
            </div>
            {row.status === "acima" && row.diffPct != null && (
              <p className="text-xs text-loss">
                Você está {formatPercent(Math.abs(row.diffPct))} acima do objetivo em {row.label}.
                {row.amountToMoveCents != null && row.amountToMoveCents < 0 && (
                  <> Cerca de {formatCurrencyCents(Math.abs(row.amountToMoveCents))} acima do ideal.</>
                )}
              </p>
            )}
            {row.status === "abaixo" && row.diffPct != null && (
              <p className="text-xs text-muted-foreground">
                Você está {formatPercent(Math.abs(row.diffPct))} abaixo do objetivo em {row.label}.
                {row.amountToMoveCents != null && row.amountToMoveCents > 0 && (
                  <> Faltam {formatCurrencyCents(row.amountToMoveCents)} para atingir a meta.</>
                )}
              </p>
            )}
            {row.status === "no-alvo" && (
              <p className="text-xs text-gain">Dentro do objetivo em {row.label}.</p>
            )}
          </div>
        ))}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar metas de alocação</DialogTitle>
            <DialogDescription>
              Defina o percentual ideal para cada categoria. Deixe em branco (ou 0) para remover a meta.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {ASSET_CATEGORIES.map((category) => (
              <div key={category.value} className="flex items-center justify-between gap-3">
                <Label htmlFor={`target-${category.value}`} className="text-sm">
                  {category.emoji} {category.label}
                </Label>
                <div className="relative w-24">
                  <Input
                    id={`target-${category.value}`}
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    className="pr-6 text-right"
                    value={drafts[category.value] ?? ""}
                    onChange={(event) =>
                      setDrafts((current) => ({ ...current, [category.value]: event.target.value }))
                    }
                  />
                  <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-muted-foreground">
                    %
                  </span>
                </div>
              </div>
            ))}
            <p className={cn("text-right text-xs", sumDrafts > 100 ? "text-loss" : "text-muted-foreground")}>
              Soma: {sumDrafts.toFixed(0)}%
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={saving} disabled={sumDrafts > 100}>
              Salvar metas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
