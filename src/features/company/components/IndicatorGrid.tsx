import { Globe } from "lucide-react"

import { getIndicatorsForAssetClass, groupIndicatorsByCategory } from "@/features/company/indicators"
import type { CompanyDetailDTO } from "@/features/company/queries"
import { FundamentalIndicatorCard } from "@/features/company/components/FundamentalIndicatorCard"

interface IndicatorGridProps {
  dto: CompanyDetailDTO
}

/// Matches FundamentalIndicatorCard's own shape/spacing exactly — "Site
/// Oficial" is a link, not a number, so it can't live in the numeric
/// IndicatorDefinition registry, but visually it belongs in the same grid
/// (same category, "Estrutura") rather than as a one-off special case
/// elsewhere on the page.
function WebsiteLinkCard({ website }: { website: string }) {
  return (
    <a
      href={website}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3.5 ring-1 ring-foreground/5 transition-colors hover:bg-accent/40"
    >
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Globe className="size-3.5" />
        Site Oficial
      </span>
      <span className="truncate text-sm font-semibold text-primary">{website.replace(/^https?:\/\//, "")}</span>
    </a>
  )
}

/// Categorized "Fundamentos" grid — one labeled subsection per
/// IndicatorCategory (Valuation, Rentabilidade, Margens, ...), each its own
/// responsive card grid. Every indicator for this asset class always
/// renders a card (see FundamentalIndicatorCard's doc comment); grouping is
/// purely presentational, driven entirely by indicators.ts's registry.
export function IndicatorGrid({ dto }: IndicatorGridProps) {
  const indicators = getIndicatorsForAssetClass(dto.assetClass)
  if (indicators.length === 0) return null

  const groups = groupIndicatorsByCategory(indicators)

  return (
    <section id="fundamentos" className="scroll-mt-24 space-y-6">
      <h2 className="text-lg font-semibold tracking-tight">Fundamentos</h2>
      {groups.map((group) => (
        <div key={group.category} className="space-y-2.5">
          <h3 className="text-sm font-medium text-muted-foreground">{group.category}</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {group.indicators.map((indicator) => (
              <FundamentalIndicatorCard key={indicator.key} companyId={dto.id} indicator={indicator} dto={dto} />
            ))}
            {group.category === "Estrutura" && dto.website && <WebsiteLinkCard website={dto.website} />}
          </div>
        </div>
      ))}
    </section>
  )
}
