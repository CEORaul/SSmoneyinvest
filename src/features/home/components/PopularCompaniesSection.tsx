import Link from "next/link"

import { TickerBadge } from "@/components/shared/TickerBadge"
import { getPopularCompanies } from "@/features/market/queries"

export async function PopularCompaniesSection() {
  const companies = await getPopularCompanies()

  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Empresas populares
          </h2>
          <p className="mt-2 text-muted-foreground">
            As mais buscadas pelos investidores brasileiros.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {companies.map((company) => (
            <Link
              key={company.ticker}
              href={`/empresa/${company.ticker}`}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-4 py-6 text-center transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <TickerBadge ticker={company.ticker} size="lg" />
              <div>
                <p className="text-sm font-semibold">{company.ticker}</p>
                <p className="text-xs text-muted-foreground">{company.name}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
