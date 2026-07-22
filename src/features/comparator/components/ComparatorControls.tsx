"use client"

import { X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo } from "react"

import { Button } from "@/components/ui/button"
import { AssetChips } from "@/features/comparator/components/AssetChips"
import { AssetSearchCombobox } from "@/features/comparator/components/AssetSearchCombobox"
import { QuickSelectMenu } from "@/features/comparator/components/QuickSelectMenu"
import { assignColors } from "@/features/comparator/colors"
import { MAX_COMPARISON_ASSETS } from "@/features/comparator/constants"
import type { CompanySearchResult } from "@/features/portfolio/queries"

export interface ComparatorCompany {
  id: string
  ticker: string
  name: string
  logoUrl: string | null
}

interface ComparatorControlsProps {
  companies: ComparatorCompany[]
  unresolvedTickers: string[]
}

function buildHref(tickers: string[]): string {
  const deduped = [...new Set(tickers.map((t) => t.toUpperCase()))].slice(0, MAX_COMPARISON_ASSETS)
  return deduped.length > 0 ? `/comparar?tickers=${deduped.join(",")}` : "/comparar"
}

/// Owns the /comparar URL's ?tickers= state — every add/remove/quick-select
/// here is a router.push, re-triggering the Server Component page's fetch,
/// rather than client-side selection state. Keeps the page shareable/
/// bookmarkable and keeps the heavy data-fetching in a real Server Component.
export function ComparatorControls({ companies, unresolvedTickers }: ComparatorControlsProps) {
  const router = useRouter()
  const currentTickers = [...companies.map((c) => c.ticker), ...unresolvedTickers]
  const colors = useMemo(() => assignColors(companies.map((c) => c.id)), [companies])
  const tickerToCompanyId = useMemo(
    () => new Map(companies.map((c) => [c.ticker, c.id])),
    [companies]
  )

  function addTickers(tickers: string[]) {
    router.push(buildHref([...currentTickers, ...tickers]))
  }

  function removeTicker(ticker: string) {
    router.push(buildHref(currentTickers.filter((t) => t !== ticker)))
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-64 flex-1">
          <AssetSearchCombobox
            onSelect={(company: CompanySearchResult) => addTickers([company.ticker])}
            disabled={companies.length + unresolvedTickers.length >= MAX_COMPARISON_ASSETS}
            disabledReason={`Máximo de ${MAX_COMPARISON_ASSETS} ativos por comparação`}
          />
        </div>
        <QuickSelectMenu scope="market" onSelect={addTickers} />
        <QuickSelectMenu scope="portfolio" onSelect={addTickers} />
      </div>

      {unresolvedTickers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <span>
            {unresolvedTickers.length === 1
              ? `Não encontramos o ativo "${unresolvedTickers[0]}".`
              : `Não encontramos os ativos: ${unresolvedTickers.join(", ")}.`}
          </span>
          {unresolvedTickers.map((ticker) => (
            <Button
              key={ticker}
              type="button"
              variant="ghost"
              size="xs"
              className="text-destructive hover:text-destructive"
              onClick={() => removeTicker(ticker)}
            >
              <X className="size-3" />
              {ticker}
            </Button>
          ))}
        </div>
      )}

      <AssetChips
        companies={companies}
        onRemove={removeTicker}
        colors={colors}
        tickerToCompanyId={tickerToCompanyId}
      />
    </div>
  )
}
