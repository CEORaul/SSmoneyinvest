"use client"

import { Search } from "lucide-react"

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
import type { AssetClass } from "@/generated/prisma/client"

export type SortOption =
  | ""
  | "alfabetica"
  | "maior-rentabilidade"
  | "maior-prejuizo"
  | "maior-participacao"
  | "maior-patrimonio"
  | "menor-patrimonio"

export const SORT_OPTION_LABELS: Record<SortOption, string> = {
  "": "Relevância",
  alfabetica: "Ordem alfabética",
  "maior-rentabilidade": "Maior rentabilidade",
  "maior-prejuizo": "Maior prejuízo",
  "maior-participacao": "Maior participação",
  "maior-patrimonio": "Maior patrimônio",
  "menor-patrimonio": "Menor patrimônio",
}

export interface PortfolioFilters {
  search: string
  categoria: AssetClass | ""
  setor: string
  dividendos: boolean
  posicao: "" | "positiva" | "negativa"
  ordenar: SortOption
}

interface FilterBarProps {
  filters: PortfolioFilters
  onChange: (filters: PortfolioFilters) => void
  categories: { value: AssetClass; label: string }[]
  sectors: string[]
}

/// Every control here is a plain controlled input — the URL sync lives in
/// PortfolioBoard (the single owner of both the search-params state and the
/// in-memory filtering), so this component never touches history/router.
export function FilterBar({ filters, onChange, categories, sectors }: FilterBarProps) {
  function set<K extends keyof PortfolioFilters>(key: K, value: PortfolioFilters[K]) {
    onChange({ ...filters, [key]: value })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative max-w-xs flex-1">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(event) => set("search", event.target.value)}
          placeholder="Buscar por ticker ou nome"
          className="pl-9"
        />
      </div>

      <Select value={filters.categoria || "all"} onValueChange={(v) => set("categoria", v === "all" ? "" : (v as AssetClass))}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas categorias</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.value} value={c.value}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {sectors.length > 0 && (
        <Select value={filters.setor || "all"} onValueChange={(v) => set("setor", v === "all" || !v ? "" : v)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Setor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos setores</SelectItem>
            {sectors.map((sector) => (
              <SelectItem key={sector} value={sector}>
                {sector}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select
        value={filters.posicao || "all"}
        onValueChange={(v) => set("posicao", v === "all" ? "" : (v as "positiva" | "negativa"))}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Posição" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toda posição</SelectItem>
          <SelectItem value="positiva">Posição positiva</SelectItem>
          <SelectItem value="negativa">Posição negativa</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.ordenar} onValueChange={(v) => set("ordenar", v as SortOption)}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Ordenar" />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(SORT_OPTION_LABELS) as SortOption[]).map((key) => (
            <SelectItem key={key || "relevancia"} value={key}>
              {SORT_OPTION_LABELS[key]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Checkbox
          checked={filters.dividendos}
          onCheckedChange={(checked) => set("dividendos", checked === true)}
        />
        <Label className="cursor-pointer font-normal">Só com dividendos</Label>
      </label>
    </div>
  )
}
