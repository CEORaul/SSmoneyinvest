import { CompanyCard } from "@/components/shared/CompanyCard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  getHighlightedCompanies,
  getTopDividendPayers,
  getTopGainers,
  getTopLosers,
} from "@/features/market/queries"

export async function MarketMoversSection() {
  const [dividendPayers, gainers, losers, highlighted] = await Promise.all([
    getTopDividendPayers(),
    getTopGainers(),
    getTopLosers(),
    getHighlightedCompanies(),
  ])

  const tabs = [
    { value: "dividendos", label: "Top Dividendos", metric: "dividendYield" as const, companies: dividendPayers },
    { value: "altas", label: "Maiores Altas", metric: "change" as const, companies: gainers },
    { value: "baixas", label: "Maiores Baixas", metric: "change" as const, companies: losers },
    { value: "destaque", label: "Empresas em Destaque", metric: "change" as const, companies: highlighted },
  ]

  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            O mercado, resumido pra você
          </h2>
          <p className="mt-2 text-muted-foreground">
            Um panorama rápido do que está acontecendo agora na B3.
          </p>
        </div>

        <Tabs defaultValue="dividendos" className="mt-10">
          <TabsList className="mx-auto flex h-auto flex-wrap justify-center gap-1 bg-transparent p-0">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-full border border-border px-4 py-1.5 data-active:bg-primary data-active:text-primary-foreground"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-8">
              {tab.companies.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {tab.companies.map((company) => (
                    <CompanyCard key={company.ticker} company={company} metric={tab.metric} />
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Ainda sem dados suficientes para esta lista.
                </p>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  )
}
