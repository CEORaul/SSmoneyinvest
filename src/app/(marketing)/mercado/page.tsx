import { TrendingUp } from "lucide-react"

import { GlobalSearch } from "@/features/search/components/GlobalSearch"
import { getSearchDropdownDefaultsAction } from "@/features/search/actions"
import { getAllSectors, searchMarketAssets } from "@/features/market/discovery-queries"
import { getSavedMarketFilters } from "@/features/market/saved-filters"
import { DEFAULT_MARKET_FILTERS } from "@/features/market/discovery-types"
import { MarketDiscoveryBoard } from "@/features/market/components/MarketDiscoveryBoard"
import { getOptionalProfile } from "@/lib/auth/session"

const INITIAL_PAGE_SIZE = 20

export default async function MercadoPage() {
  const profile = await getOptionalProfile()

  const [sectors, initialResult, searchDefaults, savedFilters] = await Promise.all([
    getAllSectors(),
    searchMarketAssets(DEFAULT_MARKET_FILTERS, "relevancia", 1, INITIAL_PAGE_SIZE),
    getSearchDropdownDefaultsAction(),
    profile ? getSavedMarketFilters(profile.id) : Promise.resolve([]),
  ])

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <TrendingUp className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Mercado</h1>
            <p className="text-muted-foreground">Descubra oportunidades utilizando filtros inteligentes.</p>
          </div>
        </div>
        <GlobalSearch
          variant="inline"
          isAuthenticated={!!profile}
          initialDefaults={searchDefaults}
          placeholder="Pesquisar ticker ou empresa..."
        />
      </div>

      <MarketDiscoveryBoard
        sectors={sectors}
        initialRows={initialResult.rows}
        initialTotalCount={initialResult.totalCount}
        initialSavedFilters={savedFilters}
        isAuthenticated={!!profile}
      />
    </div>
  )
}
