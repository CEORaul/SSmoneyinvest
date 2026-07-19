"use client"

import { Loader2, Search } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { Input } from "@/components/ui/input"
import { TickerBadge } from "@/components/shared/TickerBadge"
import { searchCompaniesAction } from "@/features/portfolio/actions"
import type { CompanySearchResult } from "@/features/portfolio/queries"

interface CompanySearchComboboxProps {
  onSelect: (company: CompanySearchResult) => void
}

/// Autocomplete by ticker (PETR4) or company name (Petrobras) — the entry
/// point for "Adicionar Ativo". No shadcn Command component in this
/// project's registry (Nova/Base UI preset doesn't ship one), so this is a
/// small hand-rolled combobox instead of pulling in a new dependency for it.
export function CompanySearchCombobox({ onSelect }: CompanySearchComboboxProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<CompanySearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Nothing to search — leave `results` as-is and let the empty query be
    // handled at render time (displayResults below), rather than resetting
    // state from inside the effect.
    if (query.trim().length === 0) {
      return
    }

    // Standard debounced-fetch pattern — flip the loading flag before
    // kicking off the timer/request, same as React's own data-fetching
    // docs. The lint rule's "no setState in effect" default is too broad
    // for this legitimate case.
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
          placeholder="Buscar por ticker (PETR4) ou nome (Petrobras)"
          className="pl-9"
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && displayResults.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-md">
          {displayResults.map((company) => (
            <button
              key={company.id}
              type="button"
              onClick={() => handleSelect(company)}
              className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
            >
              <TickerBadge ticker={company.ticker} size="sm" />
              <div className="flex-1 overflow-hidden">
                <p className="truncate font-medium">{company.ticker}</p>
                <p className="truncate text-xs text-muted-foreground">{company.name}</p>
              </div>
            </button>
          ))}
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
