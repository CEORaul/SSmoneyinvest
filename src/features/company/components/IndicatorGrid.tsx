import { getIndicatorsForAssetClass } from "@/features/company/indicators"
import type { CompanyDetailDTO } from "@/features/company/queries"
import { FundamentalIndicatorCard } from "@/features/company/components/FundamentalIndicatorCard"

interface IndicatorGridProps {
  dto: CompanyDetailDTO
}

export function IndicatorGrid({ dto }: IndicatorGridProps) {
  const indicators = getIndicatorsForAssetClass(dto.assetClass)
  if (indicators.length === 0) return null

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">Indicadores</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {indicators.map((indicator) => (
          <FundamentalIndicatorCard
            key={indicator.key}
            companyId={dto.id}
            indicator={indicator}
            dto={dto}
          />
        ))}
      </div>
    </section>
  )
}
