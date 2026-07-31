import { TrendingUp } from "lucide-react"
import dynamic from "next/dynamic"
import { Suspense } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { GlobalSearch } from "@/features/search/components/GlobalSearch"
import { getSearchDropdownDefaultsAction } from "@/features/search/actions"
import { getAllSectors, searchMarketAssets } from "@/features/market/discovery-queries"
import { getSavedMarketFilters } from "@/features/market/saved-filters"
import { DEFAULT_MARKET_FILTERS } from "@/features/market/discovery-types"
import { MercadoBoardSection } from "@/features/market/components/dashboard/MercadoBoardSection"
import { MarketAiSummaryCard } from "@/features/market/components/dashboard/MarketAiSummaryCard"
import { MarketCalendarSection } from "@/features/market/components/dashboard/MarketCalendarSection"
import { MarketEtfHighlights } from "@/features/market/components/dashboard/MarketEtfHighlights"
import { MarketFiiHighlights } from "@/features/market/components/dashboard/MarketFiiHighlights"
import { MarketMoversGrid } from "@/features/market/components/dashboard/MarketMoversGrid"
import { MarketNewsHighlights } from "@/features/market/components/dashboard/MarketNewsHighlights"
import { MarketTickerTapeSection } from "@/features/market/components/dashboard/MarketTickerTapeSection"
import { getMarketNewsHighlights } from "@/features/market/news-highlights"
import { getOptionalProfile } from "@/lib/auth/session"

const INITIAL_PAGE_SIZE = 20

// Heavy TradingView sections are code-split out of the page's main bundle —
// each one still lazy-mounts its actual widget script only once its own
// container scrolls into view (see useIsVisibleOnce inside every
// TradingView* component), so this only trims initial JS, never widget
// network calls. No ssr:false: these already render a real SSR-safe idle
// state (see useChartTheme's own mount-guard), and ssr:false isn't
// available for a next/dynamic call made from a Server Component anyway.
const MarketOverviewSection = dynamic(() =>
  import("@/features/market/components/dashboard/MarketOverviewSection").then((mod) => mod.MarketOverviewSection)
)
const MarketHeatmapSection = dynamic(() =>
  import("@/features/market/components/dashboard/MarketHeatmapSection").then((mod) => mod.MarketHeatmapSection)
)
const MarketIndicesSection = dynamic(() =>
  import("@/features/market/components/dashboard/MarketIndicesSection").then((mod) => mod.MarketIndicesSection)
)
const MarketCryptoSection = dynamic(() =>
  import("@/features/market/components/dashboard/MarketCryptoSection").then((mod) => mod.MarketCryptoSection)
)

function SectionSkeleton({ className = "h-72" }: { className?: string }) {
  return <Skeleton className={`w-full rounded-xl ${className}`} />
}

async function MarketNewsSection({ profileId }: { profileId: string | null }) {
  const articles = await getMarketNewsHighlights(profileId, 6)
  return <MarketNewsHighlights articles={articles} />
}

/// Mercado 2.0 — the platform's flagship screen, blending TradingView/
/// Investidor10/Status Invest-style breadth with SSmoney's own visual
/// identity. Every TradingView widget reuses the exact ChartProvider/
/// ChartService/TradingViewService architecture built in the prior phase
/// (no new chart implementation); every app-data section reuses existing
/// queries (getTopGainers/getTopLosers/getPopularCompanies/getTopByVolume/
/// searchMarketAssets/getTodayDividendEvents/getBucketFeed) — nothing here
/// duplicates a query that already existed. Sections that have no real
/// backing data anywhere in this app (Índices, Criptomoedas, most of the
/// Calendário) are built exclusively from live TradingView widgets or an
/// honest "sem dados" state, never a fabricated number.
///
/// Carteira/Radar/Comparador/Alertas/Notícias/Agenda/Empresa/FinIA are
/// untouched by this phase — every component above only reuses their
/// existing exports (queries, NewsCard, ExplainWithAiButton, etc.), never
/// edits their files.
export default async function MercadoPage() {
  const profile = await getOptionalProfile()

  const [sectors, initialResult, searchDefaults, savedFilters] = await Promise.all([
    getAllSectors(),
    searchMarketAssets(DEFAULT_MARKET_FILTERS, "relevancia", 1, INITIAL_PAGE_SIZE),
    getSearchDropdownDefaultsAction(),
    profile ? getSavedMarketFilters(profile.id) : Promise.resolve([]),
  ])

  return (
    <div className="w-full space-y-8 pb-16">
      <MarketTickerTapeSection />

      <div className="w-full space-y-8 px-6 pt-6 lg:px-8 xl:px-10 2xl:px-12">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <TrendingUp className="size-5" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Mercado</h1>
              <p className="text-muted-foreground">
                Cotações, mapas de calor, movimentos e notícias — tudo em um só lugar.
              </p>
            </div>
          </div>
          <GlobalSearch
            variant="inline"
            isAuthenticated={!!profile}
            initialDefaults={searchDefaults}
            placeholder="Pesquisar ticker, empresa ou setor..."
          />
        </div>

        <Suspense fallback={<SectionSkeleton className="h-28" />}>
          <MarketAiSummaryCard />
        </Suspense>

        <Suspense fallback={<SectionSkeleton className="h-[452px]" />}>
          <MarketOverviewSection />
        </Suspense>

        <Suspense fallback={<SectionSkeleton className="h-[452px]" />}>
          <MarketHeatmapSection />
        </Suspense>

        <div>
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Maiores Movimentos</h2>
          <Suspense
            fallback={
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SectionSkeleton key={i} className="h-64" />
                ))}
              </div>
            }
          >
            <MarketMoversGrid />
          </Suspense>
        </div>

        <Suspense fallback={<SectionSkeleton className="h-96" />}>
          <MarketIndicesSection />
        </Suspense>

        <Suspense fallback={<SectionSkeleton className="h-96" />}>
          <MarketCryptoSection />
        </Suspense>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Suspense fallback={<SectionSkeleton className="h-96" />}>
            <MarketFiiHighlights />
          </Suspense>
          <Suspense fallback={<SectionSkeleton className="h-96" />}>
            <MarketEtfHighlights />
          </Suspense>
        </div>

        <Suspense fallback={<SectionSkeleton className="h-96" />}>
          <MarketCalendarSection />
        </Suspense>

        <Suspense
          fallback={
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <SectionSkeleton key={i} className="h-80" />
              ))}
            </div>
          }
        >
          <MarketNewsSection profileId={profile?.id ?? null} />
        </Suspense>

        <div>
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Explorar o Mercado</h2>
          <MercadoBoardSection
            sectors={sectors}
            initialRows={initialResult.rows}
            initialTotalCount={initialResult.totalCount}
            initialSavedFilters={savedFilters}
            isAuthenticated={!!profile}
          />
        </div>
      </div>
    </div>
  )
}
