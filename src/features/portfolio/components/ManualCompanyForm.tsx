"use client"

import { useState } from "react"
import { toast } from "sonner"

import type { AssetClass } from "@/generated/prisma/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/shared/FormField"
import { createManualCompanyAction } from "@/features/portfolio/actions"
import type { CompanySearchResult } from "@/features/portfolio/queries"

interface ManualCompanyFormProps {
  assetClass: Extract<AssetClass, "CRYPTO" | "FIXED_INCOME" | "OTHER">
  onCreated: (company: CompanySearchResult) => void
}

/// Stands in for the search box on categories with no market-data provider
/// connected yet — the user names the investment themselves instead of
/// picking it from a synced list. Trades against it always require the
/// manual price override (see TradeDialog), since there's no historical
/// series to look up automatically.
export function ManualCompanyForm({ assetClass, onCreated }: ManualCompanyFormProps) {
  const [ticker, setTicker] = useState("")
  const [name, setName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit() {
    if (!ticker.trim() || !name.trim()) return

    setIsSubmitting(true)
    const result = await createManualCompanyAction({ ticker, name, assetClass })
    setIsSubmitting(false)

    if (!result.ok || !result.company) {
      toast.error(result.error ?? "Não foi possível adicionar o investimento")
      return
    }

    onCreated(result.company)
  }

  return (
    <div className="space-y-4 rounded-lg border border-dashed border-border p-3">
      <p className="text-xs text-muted-foreground">
        Ainda não há uma fonte de dados conectada para esta categoria — identifique o
        investimento manualmente. O preço de cada operação também será informado por você.
      </p>

      <FormField label="Identificador" htmlFor="manual-ticker">
        <Input
          id="manual-ticker"
          placeholder="Ex.: BTC, TESOURO-SELIC-2029"
          value={ticker}
          onChange={(event) => setTicker(event.target.value)}
        />
      </FormField>

      <FormField label="Nome" htmlFor="manual-name">
        <Input
          id="manual-name"
          placeholder="Ex.: Bitcoin, Tesouro Selic 2029"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </FormField>

      <Button
        type="button"
        variant="secondary"
        className="w-full"
        loading={isSubmitting}
        disabled={!ticker.trim() || !name.trim()}
        onClick={handleSubmit}
      >
        Continuar
      </Button>
    </div>
  )
}
