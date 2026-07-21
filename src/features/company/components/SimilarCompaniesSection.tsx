import { CompanyCard } from "@/components/shared/CompanyCard"
import type { CompanyListItem } from "@/types"

interface SimilarCompaniesSectionProps {
  companies: CompanyListItem[]
}

export function SimilarCompaniesSection({ companies }: SimilarCompaniesSectionProps) {
  if (companies.length === 0) return null

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">Empresas Semelhantes</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {companies.map((company) => (
          <CompanyCard key={company.ticker} company={company} />
        ))}
      </div>
    </section>
  )
}
