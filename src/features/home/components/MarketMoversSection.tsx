import { CompanyCard } from "@/components/shared/CompanyCard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  getHighlightedCompanies,
  getTopDividendPayers,
  getTopGainers,
  getTopLosers,
} from "@/features/home/mock-data"

const TABS = [
  { value: "dividendos", label: "Top Dividendos", metric: "dividendYield" as const, companies: getTopDividendPayers() },
  { value: "altas", label: "Maiores Altas", metric: "change" as const, companies: getTopGainers() },
  { value: "baixas", label: "Maiores Baixas", metric: "change" as const, companies: getTopLosers() },
  { value: "destaque", label: "Empresas em Destaque", metric: "change" as const, companies: getHighlightedCompanies() },
]

export function MarketMoversSection() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            O mercado, resumido pra você
          </h2>
          <p className="mt-2 text-muted-foreground">
            Um panorama rápido do que está acontecendo — dados ilustrativos.
          </p>
        </div>

        <Tabs defaultValue="dividendos" className="mt-10">
          <TabsList className="mx-auto flex h-auto flex-wrap justify-center gap-1 bg-transparent p-0">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-full border border-border px-4 py-1.5 data-active:bg-primary data-active:text-primary-foreground"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-8">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {tab.companies.map((company) => (
                  <CompanyCard key={company.ticker} company={company} metric={tab.metric} />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  )
}
