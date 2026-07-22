"use client"

import { Loader2, Search } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { TickerBadge } from "@/components/shared/TickerBadge"
import { Input } from "@/components/ui/input"
import { getAssetCategoryMeta } from "@/features/portfolio/asset-category"
import { searchCompaniesAction } from "@/features/portfolio/actions"
import type { CompanySearchResult } from "@/features/portfolio/queries"

interface AssetSearchComboboxProps {
  onSelect: (company: CompanySearchResult) => void
  disabled?: boolean
  disabledReason?: string
}

/// Cross-category sibling of CompanySearchCombobox — same debounce/click-
/// outside interaction shell, but genuinely different post-select behavior
/// (append a chip here vs. replace a single field there) and it searches
/// every category at once (assetClass left undefined), which
/// searchCompaniesAction/searchCompanies already support unchanged.
export function AssetSearchCombobox({ onSelect, disabled, disabledReason }: AssetSearchComboboxProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<CompanySearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.trim().length === 0) {
      return
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true)
    const timeout = setTimeout(() => {
      searchCompaniesAction(query).then((found) => {
        setResults(found)
        setIsLoading(false)
        setIsOpen(true)
      })
    }, 300)

    return () => clearTimeout(timeout)
  }, [query])

  const displayResults = query.trim().length === 0 ? [] : results

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function handleSelect(company: CompanySearchResult) {
    onSelect(company)
    setQuery("")
    setResults([])
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setIsOpen(true)
          }}
          onFocus={() => displayResults.length > 0 && setIsOpen(true)}
          placeholder="Buscar por ticker, nome, empresa ou setor"
          className="pl-9"
          autoComplete="off"
          disabled={disabled}
          title={disabled ? disabledReason : undefined}
        />
        {isLoading && (
          <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && displayResults.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-md">
          {displayResults.map((company) => {
            const meta = getAssetCategoryMeta(company.assetClass)
            return (
              <button
                key={company.id}
                type="button"
                onClick={() => handleSelect(company)}
                className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
              >
                <TickerBadge ticker={company.ticker} logoUrl={company.logoUrl} size="sm" />
                <div className="flex-1 overflow-hidden">
                  <p className="truncate font-medium">{company.ticker}</p>
                  <p className="truncate text-xs text-muted-foreground">{company.name}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {meta.emoji} {meta.label}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {isOpen && !isLoading && query.trim().length > 0 && displayResults.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover p-3 text-sm text-muted-foreground shadow-md">
          Nenhum ativo encontrado.
        </div>
      )}
    </div>
  )
}
