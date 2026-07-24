"use client"

import { useEffect, useState } from "react"

import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { translateSector } from "@/features/company/sector-labels"
import {
  UNAVAILABLE_FILTER_LABELS,
  type MarketFilters,
  type UnavailableMarketFilterKey,
} from "@/features/market/discovery-types"
import { UnavailableFilterControl } from "@/features/market/components/UnavailableFilterControl"

interface MarketFilterBarProps {
  filters: MarketFilters
  onChange: (filters: MarketFilters) => void
  sectors: string[]
}

const UNAVAILABLE_KEYS: UnavailableMarketFilterKey[] = [
  "pais",
  "ibovespa",
  "smallCaps",
  "blueChips",
  "tagAlong",
  "novo",
]

function toCents(value: string): number | null {
  const parsed = Number(value)
  return value.trim() === "" || Number.isNaN(parsed) ? null : Math.round(parsed * 100)
}

function fromCents(cents: number | null): string {
  return cents == null ? "" : String(cents / 100)
}

function toNumber(value: string): number | null {
  const parsed = Number(value)
  return value.trim() === "" || Number.isNaN(parsed) ? null : parsed
}

/// Every numeric/text field here is debounced (400ms of no typing) before
/// reaching the parent's committed filter state, matching the spec's
/// "pesquisa com debounce" performance requirement — Select/checkbox
/// changes are discrete choices, so they propagate immediately.
export function MarketFilterBar({ filters, onChange, sectors }: MarketFilterBarProps) {
  // Local draft, debounced into the parent's committed filters below. When
  // the parent needs to reset this away from a change that *didn't*
  // originate here (a saved filter applied, an active-filter chip
  // removed), it changes this component's `key` prop to force a fresh
  // mount with the new `filters` as the initial draft — the standard React
  // way to reset state from an external signal, instead of an effect that
  // writes state on every prop change.
  const [draft, setDraft] = useState(filters)

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (JSON.stringify(draft) !== JSON.stringify(filters)) onChange(draft)
    }, 400)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-arms on draft changes; onChange/filters are read, not depended on, to avoid re-triggering from the parent's own update
  }, [draft])

  function set<K extends keyof MarketFilters>(key: K, value: MarketFilters[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Preço mínimo</Label>
          <Input
            type="number"
            min={0}
            placeholder="R$ 0"
            value={fromCents(draft.precoMinCents)}
            onChange={(e) => set("precoMinCents", toCents(e.target.value))}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Preço máximo</Label>
          <Input
            type="number"
            min={0}
            placeholder="Sem limite"
            value={fromCents(draft.precoMaxCents)}
            onChange={(e) => set("precoMaxCents", toCents(e.target.value))}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Dividend Yield mínimo (%)</Label>
          <Input
            type="number"
            min={0}
            placeholder="0"
            value={draft.dyMinPct ?? ""}
            onChange={(e) => set("dyMinPct", toNumber(e.target.value))}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">P/L máximo</Label>
          <Input
            type="number"
            min={0}
            placeholder="Sem limite"
            value={draft.plMax ?? ""}
            onChange={(e) => set("plMax", toNumber(e.target.value))}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">P/VP máximo</Label>
          <Input
            type="number"
            min={0}
            placeholder="Sem limite"
            value={draft.pvpMax ?? ""}
            onChange={(e) => set("pvpMax", toNumber(e.target.value))}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">ROE mínimo (%)</Label>
          <Input
            type="number"
            placeholder="Sem limite"
            value={draft.roeMinPct ?? ""}
            onChange={(e) => set("roeMinPct", toNumber(e.target.value))}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Liquidez mínima (volume)</Label>
          <Input
            type="number"
            min={0}
            placeholder="Sem limite"
            value={draft.liquidezMin ?? ""}
            onChange={(e) => set("liquidezMin", toNumber(e.target.value))}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Market Cap mínima</Label>
          <Input
            type="number"
            min={0}
            placeholder="R$ 0"
            value={fromCents(draft.marketCapMinCents)}
            onChange={(e) => set("marketCapMinCents", toCents(e.target.value))}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Setor</Label>
          <Select value={draft.setor || "all"} onValueChange={(v) => set("setor", v === "all" || !v ? "" : v)}>
            <SelectTrigger className="w-full">
              {/* Base UI's Select.Value shows the raw value string unless
                  told how to format it — this maps it back to the same
                  translated label the matching SelectItem below shows. */}
              <SelectValue>{(value: string) => (value === "all" ? "Todos setores" : translateSector(value))}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos setores</SelectItem>
              {sectors.map((sector) => (
                <SelectItem key={sector} value={sector}>
                  {translateSector(sector)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <label className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground">
        <Checkbox
          checked={draft.pagadoraDividendos}
          onCheckedChange={(checked) => set("pagadoraDividendos", checked === true)}
        />
        <span className="cursor-pointer">Somente pagadoras de dividendos</span>
      </label>

      <div className="space-y-1.5 border-t border-border pt-3">
        <p className="text-xs text-muted-foreground">
          Filtros abaixo dependem de dados que a SSmoney ainda não sincroniza:
        </p>
        <div className="flex flex-wrap gap-1.5">
          {UNAVAILABLE_KEYS.map((key) => (
            <UnavailableFilterControl key={key} filterKey={key} label={UNAVAILABLE_FILTER_LABELS[key]} />
          ))}
        </div>
      </div>
    </div>
  )
}
