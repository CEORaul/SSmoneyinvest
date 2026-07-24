"use client"

import { Button } from "@/components/ui/button"
import { ASSET_CATEGORIES } from "@/features/portfolio/asset-category"
import type { AssetClass } from "@/generated/prisma/client"

interface CategoryChipsProps {
  value: AssetClass | "TODOS"
  onChange: (value: AssetClass | "TODOS") => void
}

/// Reuses the exact same 7-category taxonomy already used across Carteira/
/// Radar/asset-category.ts — "Tesouro Direto" and "Fundos" from the brief
/// map onto the existing Renda Fixa/Outros Investimentos categories rather
/// than a parallel taxonomy, so a category means the same thing everywhere
/// in the app.
export function CategoryChips({ value, onChange }: CategoryChipsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Button variant={value === "TODOS" ? "secondary" : "outline"} size="sm" onClick={() => onChange("TODOS")}>
        Todos
      </Button>
      {ASSET_CATEGORIES.map((category) => (
        <Button
          key={category.value}
          variant={value === category.value ? "secondary" : "outline"}
          size="sm"
          onClick={() => onChange(category.value)}
        >
          <span aria-hidden>{category.emoji}</span>
          {category.label}
        </Button>
      ))}
    </div>
  )
}
