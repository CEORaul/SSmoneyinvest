"use client"

import { Search } from "lucide-react"
import { useEffect, useState } from "react"

import { Input } from "@/components/ui/input"

interface NewsSearchBarProps {
  value: string
  onChange: (value: string) => void
}

/// Debounced (400ms) so typing never fires one feed refetch per keystroke —
/// same idiom as MarketFilterBar's draft-state debounce.
export function NewsSearchBar({ value, onChange }: NewsSearchBarProps) {
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (draft !== value) onChange(draft)
    }, 400)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-arms on draft changes; onChange/value are read, not depended on
  }, [draft])

  return (
    <div className="relative w-full sm:max-w-sm">
      <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Buscar por ticker, empresa ou palavra-chave"
        className="pl-9"
      />
    </div>
  )
}
