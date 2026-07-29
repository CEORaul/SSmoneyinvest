"use client"

import { ArrowDown, ArrowUp } from "lucide-react"
import { useState } from "react"
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
import { Label } from "@/components/ui/label"
import { TickerBadge } from "@/components/shared/TickerBadge"
import { AssetSearchCombobox } from "@/features/comparator/components/AssetSearchCombobox"
import { createAlertAction, updateAlertAction } from "@/features/alerts/actions"
import type { AlertDirection, PriceAlertRow } from "@/features/alerts/types"
import type { CompanySearchResult } from "@/features/portfolio/queries"
import { formatCurrencyCents } from "@/utils/format"

interface CreateAlertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  /// When set, the dialog edits this alert's direction/target instead of
  /// creating a new one — the asset itself is fixed and not re-selectable.
  editAlert?: PriceAlertRow | null
  /// When set (and editAlert is not), opens in create mode with the asset
  /// already selected and direction/target pre-filled — the "preencher
  /// formulário" action FinIA can trigger (e.g. "criar alerta para PETR4
  /// abaixo de R$30"). The user still has to click "Criar alerta"; nothing
  /// is ever submitted on their behalf.
  initialPrefill?: CompanySearchResult & { direction: AlertDirection; targetPriceCents: number }
  /// Lighter-weight variant of initialPrefill for quick-alert flows (e.g.
  /// a news card's "Adicionar alerta") — pre-selects the asset only. direction/targetInput
  /// stay at their normal defaults ("BELOW", empty) so nothing pre-fills a
  /// price the user might submit without noticing; ignored when editAlert
  /// or initialPrefill is set. Callers that reuse one dialog instance across
  /// different quick-alert targets should key it by company id so this seed
  /// value re-applies on each open (useState only reads it on mount).
  initialCompany?: CompanySearchResult
}

function toCents(value: string): number | null {
  const parsed = Number(value.replace(",", "."))
  return value.trim() === "" || Number.isNaN(parsed) || parsed <= 0 ? null : Math.round(parsed * 100)
}

export function CreateAlertDialog({
  open,
  onOpenChange,
  onSaved,
  editAlert,
  initialPrefill,
  initialCompany,
}: CreateAlertDialogProps) {
  const isEdit = !!editAlert
  const [selectedCompany, setSelectedCompany] = useState<CompanySearchResult | null>(
    initialPrefill ?? initialCompany ?? null
  )
  const [direction, setDirection] = useState<AlertDirection>(editAlert?.direction ?? initialPrefill?.direction ?? "BELOW")
  const [targetInput, setTargetInput] = useState(
    editAlert
      ? String(editAlert.targetPriceCents / 100)
      : initialPrefill
        ? String(initialPrefill.targetPriceCents / 100)
        : ""
  )
  const [saving, setSaving] = useState(false)

  const company = editAlert
    ? { ticker: editAlert.ticker, name: editAlert.name, logoUrl: editAlert.logoUrl, priceCents: editAlert.currentPriceCents }
    : selectedCompany

  function reset() {
    setSelectedCompany(null)
    setDirection("BELOW")
    setTargetInput("")
  }

  async function handleSubmit() {
    const targetPriceCents = toCents(targetInput)
    if (!targetPriceCents) {
      toast.error("Informe um preço alvo válido, maior que zero.")
      return
    }
    if (!isEdit && !selectedCompany) {
      toast.error("Pesquise e selecione um ativo.")
      return
    }

    setSaving(true)
    const result = isEdit
      ? await updateAlertAction({ id: editAlert!.id, direction, targetPriceCents })
      : await createAlertAction({ companyId: selectedCompany!.id, direction, targetPriceCents })
    setSaving(false)

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível salvar o alerta.")
      return
    }

    toast.success(isEdit ? "Alerta atualizado." : "Alerta criado.")
    reset()
    onOpenChange(false)
    onSaved()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar alerta" : "Novo alerta"}</DialogTitle>
          <DialogDescription>
            Seja avisado quando o ativo atingir o preço desejado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>Ativo</Label>
              {selectedCompany ? (
                <div className="flex items-center justify-between rounded-lg border border-border p-2">
                  <div className="flex items-center gap-2">
                    <TickerBadge ticker={selectedCompany.ticker} logoUrl={selectedCompany.logoUrl} size="sm" />
                    <div>
                      <p className="text-sm font-medium">{selectedCompany.ticker}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrencyCents(selectedCompany.priceCents)}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedCompany(null)}>
                    Trocar
                  </Button>
                </div>
              ) : (
                <AssetSearchCombobox onSelect={setSelectedCompany} />
              )}
            </div>
          )}

          {isEdit && company && (
            <div className="flex items-center gap-2 rounded-lg border border-border p-2">
              <TickerBadge ticker={company.ticker} logoUrl={company.logoUrl} size="sm" />
              <div>
                <p className="text-sm font-medium">{company.ticker}</p>
                <p className="text-xs text-muted-foreground">Preço atual: {formatCurrencyCents(company.priceCents)}</p>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Condição</Label>
            <div className="flex gap-1 rounded-lg bg-muted p-0.5">
              <Button
                type="button"
                variant={direction === "BELOW" ? "default" : "ghost"}
                size="sm"
                className="flex-1"
                onClick={() => setDirection("BELOW")}
              >
                <ArrowDown className="size-4" />
                Abaixo de
              </Button>
              <Button
                type="button"
                variant={direction === "ABOVE" ? "default" : "ghost"}
                size="sm"
                className="flex-1"
                onClick={() => setDirection("ABOVE")}
              >
                <ArrowUp className="size-4" />
                Acima de
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="alert-target-price">Preço alvo</Label>
            <Input
              id="alert-target-price"
              type="number"
              min={0}
              step="0.01"
              placeholder="R$ 0,00"
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            {isEdit ? "Salvar" : "Criar alerta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
