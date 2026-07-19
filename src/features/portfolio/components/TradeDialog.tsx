"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

import type { AssetClass } from "@/generated/prisma/client"
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
import { DatePickerField } from "@/components/shared/DatePickerField"
import { FormField } from "@/components/shared/FormField"
import { TickerBadge } from "@/components/shared/TickerBadge"
import { ASSET_CATEGORIES, getAssetCategoryMeta } from "@/features/portfolio/asset-category"
import { CompanySearchCombobox } from "@/features/portfolio/components/CompanySearchCombobox"
import { ManualCompanyForm } from "@/features/portfolio/components/ManualCompanyForm"
import { previewTradePriceAction, recordTradeAction } from "@/features/portfolio/actions"
import type { CompanySearchResult } from "@/features/portfolio/queries"
import { cn } from "@/lib/utils"
import { formatCurrencyCents } from "@/utils/format"

export interface TradeCompany {
  id: string
  ticker: string
  name: string
  logoUrl: string | null
  assetClass: AssetClass
}

interface TradeDialogProps {
  type: "BUY" | "SELL"
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-known when opened from a position row (sell) — skips category+search. */
  company?: TradeCompany
  /** Shown as a hint and used for the friendly overselling error. */
  ownedQuantity?: string
}

const SOURCE_LABELS: Record<string, string> = {
  "brapi.dev": "brapi.dev",
  "yahoo-finance": "Yahoo Finance",
  cache: "cache interno",
}

export function TradeDialog({ type, open, onOpenChange, company, ownedQuantity }: TradeDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState<AssetClass | null>(
    company?.assetClass ?? null
  )
  const [selectedCompany, setSelectedCompany] = useState<TradeCompany | CompanySearchResult | null>(
    company ?? null
  )
  const [date, setDate] = useState<Date | undefined>()
  const [quantity, setQuantity] = useState("")
  const [note, setNote] = useState("")
  const [showPriceOverride, setShowPriceOverride] = useState(false)
  const [overridePrice, setOverridePrice] = useState("")

  const [preview, setPreview] = useState<{ priceCents: number; source: string } | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Cripto/Renda Fixa/Outros have no market-data provider — there's no
  // historical series to look up, so the manual price field is mandatory
  // and shown directly (no "editar preço" toggle) rather than optional.
  const requiresManualPrice = selectedCompany
    ? !getAssetCategoryMeta(selectedCompany.assetClass).hasMarketData
    : false
  const effectiveShowOverride = showPriceOverride || requiresManualPrice

  const previewInputsValid =
    !!selectedCompany && !!date && !effectiveShowOverride && !requiresManualPrice

  useEffect(() => {
    if (!previewInputsValid || !selectedCompany || !date) return

    // Standard debounced-fetch pattern — see the same note in
    // CompanySearchCombobox.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsPreviewLoading(true)
    setPreviewError(null)
    const timeout = setTimeout(() => {
      previewTradePriceAction(selectedCompany.id, date.toISOString()).then((result) => {
        setIsPreviewLoading(false)
        if (result.ok && result.priceCents != null) {
          setPreview({ priceCents: result.priceCents, source: result.source ?? "cache" })
        } else {
          setPreview(null)
          setPreviewError(result.error ?? "Não foi possível obter a cotação.")
        }
      })
    }, 250)

    return () => clearTimeout(timeout)
  }, [previewInputsValid, selectedCompany, date])

  function resetForm() {
    setSelectedCategory(company?.assetClass ?? null)
    setSelectedCompany(company ?? null)
    setDate(undefined)
    setQuantity("")
    setNote("")
    setShowPriceOverride(false)
    setOverridePrice("")
    setPreview(null)
    setPreviewError(null)
  }

  async function handleSubmit() {
    if (!selectedCompany || !date || !quantity) return

    setIsSubmitting(true)
    const result = await recordTradeAction({
      companyId: selectedCompany.id,
      type,
      date,
      quantity: Number(quantity),
      note: note || undefined,
      overridePriceCents:
        effectiveShowOverride && overridePrice ? Math.round(Number(overridePrice) * 100) : undefined,
    })
    setIsSubmitting(false)

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível registrar a operação")
      return
    }

    toast.success(type === "BUY" ? "Compra registrada" : "Venda registrada")
    onOpenChange(false)
    resetForm()
  }

  const quantityNumber = Number(quantity)
  const totalCents =
    effectiveShowOverride && overridePrice
      ? Math.round(Number(overridePrice) * 100 * (quantityNumber || 0))
      : preview
        ? Math.round(preview.priceCents * (quantityNumber || 0))
        : null

  const canSubmit =
    !!selectedCompany &&
    !!date &&
    quantityNumber > 0 &&
    (effectiveShowOverride ? Number(overridePrice) > 0 : !!preview)

  const categoryMeta = selectedCategory ? getAssetCategoryMeta(selectedCategory) : null

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        if (!nextOpen) resetForm()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{type === "BUY" ? "Registrar compra" : "Registrar venda"}</DialogTitle>
          <DialogDescription>
            {type === "BUY"
              ? "Informe o ativo, a data e a quantidade — o preço é preenchido automaticamente quando possível."
              : "Informe a data e a quantidade — o preço é preenchido automaticamente quando possível."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!company && !selectedCategory ? (
            <div className="grid grid-cols-2 gap-2">
              {ASSET_CATEGORIES.map((category) => (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => setSelectedCategory(category.value)}
                  className="flex flex-col items-center gap-1.5 rounded-lg border border-border px-3 py-4 text-center transition-colors hover:border-primary/40 hover:bg-accent"
                >
                  <span className="text-2xl">{category.emoji}</span>
                  <span className="text-sm font-medium">{category.label}</span>
                </button>
              ))}
            </div>
          ) : !selectedCompany ? (
            <>
              {!company && categoryMeta && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
                >
                  ← {categoryMeta.emoji} {categoryMeta.label}
                </button>
              )}
              {categoryMeta?.hasMarketData ? (
                <CompanySearchCombobox
                  assetClass={categoryMeta.value}
                  onSelect={(found) => setSelectedCompany(found)}
                />
              ) : categoryMeta ? (
                <ManualCompanyForm
                  assetClass={categoryMeta.value as "CRYPTO" | "FIXED_INCOME" | "OTHER"}
                  onCreated={(created) => setSelectedCompany(created)}
                />
              ) : null}
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
                <TickerBadge ticker={selectedCompany.ticker} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{selectedCompany.ticker}</p>
                  <p className="truncate text-xs text-muted-foreground">{selectedCompany.name}</p>
                </div>
                {!company && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedCompany(null)
                    }}
                  >
                    Trocar
                  </Button>
                )}
              </div>

              {ownedQuantity && (
                <p className="text-xs text-muted-foreground">
                  Você possui {ownedQuantity} unidade(s) atualmente.
                </p>
              )}

              <FormField label="Data" htmlFor="trade-date">
                <DatePickerField
                  id="trade-date"
                  value={date}
                  onChange={setDate}
                  disabledDate={(d) => d > new Date()}
                />
              </FormField>

              <FormField label="Quantidade" htmlFor="trade-quantity">
                <Input
                  id="trade-quantity"
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                />
              </FormField>

              {requiresManualPrice ? (
                <FormField label="Preço da operação" htmlFor="trade-override-price">
                  <Input
                    id="trade-override-price"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="R$ 0,00"
                    value={overridePrice}
                    onChange={(event) => setOverridePrice(event.target.value)}
                  />
                </FormField>
              ) : !showPriceOverride ? (
                <button
                  type="button"
                  onClick={() => setShowPriceOverride(true)}
                  className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Editar preço da operação
                </button>
              ) : (
                <FormField label="Preço manual (avançado)" htmlFor="trade-override-price">
                  <Input
                    id="trade-override-price"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="R$ 0,00"
                    value={overridePrice}
                    onChange={(event) => setOverridePrice(event.target.value)}
                  />
                </FormField>
              )}

              {previewInputsValid && (
                <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                  {isPreviewLoading ? (
                    <span className="text-muted-foreground">Buscando cotação histórica...</span>
                  ) : previewError ? (
                    <span className="text-destructive">{previewError}</span>
                  ) : preview ? (
                    <span>
                      {formatCurrencyCents(preview.priceCents)} × {quantity || 0} ={" "}
                      <span className="font-semibold">
                        {formatCurrencyCents(totalCents ?? 0)}
                      </span>
                      <span className="ml-1 text-xs text-muted-foreground">
                        (fonte: {SOURCE_LABELS[preview.source] ?? preview.source})
                      </span>
                    </span>
                  ) : null}
                </div>
              )}

              {effectiveShowOverride && totalCents != null && quantityNumber > 0 && (
                <p className={cn("text-sm text-muted-foreground")}>
                  Total:{" "}
                  <span className="font-semibold text-foreground">
                    {formatCurrencyCents(totalCents)}
                  </span>
                </p>
              )}
            </>
          )}
        </div>

        {selectedCompany && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} loading={isSubmitting} disabled={!canSubmit}>
              Salvar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
