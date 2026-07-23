import { Radar as RadarIcon } from "lucide-react"

import { GlobalSearch } from "@/features/search/components/GlobalSearch"
import { getSearchDropdownDefaultsAction } from "@/features/search/actions"
import { getFavoriteCompanies } from "@/features/company/queries"
import { getDividendsReceivedThisMonth, getPatrimonyHistory, getPortfolioTimeline } from "@/features/portfolio/analytics"
import { computeTopMovers } from "@/features/portfolio/insights"
import { getPortfolioSummary } from "@/features/portfolio/queries"
import { DividendsRadarSection } from "@/features/radar/components/DividendsRadarSection"
import { EarningsRadarSection } from "@/features/radar/components/EarningsRadarSection"
import { NewsRadarSection } from "@/features/radar/components/NewsRadarSection"
import { OpportunitiesSection } from "@/features/radar/components/OpportunitiesSection"
import { PortfolioAlertsSection } from "@/features/radar/components/PortfolioAlertsSection"
import { RadarAiCardSuspense } from "@/features/radar/components/RadarAiCardSuspense"
import { RadarDailySummaryCard } from "@/features/radar/components/RadarDailySummaryCard"
import { RadarFeed } from "@/features/radar/components/RadarFeed"
import { UpcomingEventsSection } from "@/features/radar/components/UpcomingEventsSection"
import {
  alertsToFeedItems,
  buildFeedFromTimeline,
  buildPriceMoveFeedItems,
  buildPriceMoveFeedItemsForFavorites,
  computeOpportunities,
  computePortfolioAlerts,
  computePortfolioDailyChangePct,
} from "@/features/radar/insights"
import { getFiftyTwoWeekRangeForCompanies } from "@/features/radar/queries"
import type { RadarFeedItem } from "@/features/radar/types"
import { requireUser } from "@/lib/auth/session"

export default async function RadarPage() {
  const profile = await requireUser()

  const [{ positions, totals, byCategory }, dividendsReceivedThisMonthCents, timeline, patrimonyHistoryThisMonth, favorites, searchDefaults] =
    await Promise.all([
      getPortfolioSummary(profile.id),
      getDividendsReceivedThisMonth(profile.id),
      getPortfolioTimeline(profile.id),
      getPatrimonyHistory(profile.id, "1M"),
      getFavoriteCompanies(profile.id),
      getSearchDropdownDefaultsAction(),
    ])

  const header = (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <RadarIcon className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Radar</h1>
          <p className="text-muted-foreground">
            Os acontecimentos da sua carteira, favoritos e do mercado, em um só lugar.
          </p>
        </div>
      </div>
      <GlobalSearch variant="inline" isAuthenticated initialDefaults={searchDefaults} placeholder="Buscar ticker, empresa ou setor..." />
    </div>
  )

  if (positions.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <UpcomingEventsSection />
        <NewsRadarSection news={[]} />
      </div>
    )
  }

  const companyIds = positions.map((p) => p.companyId)
  const fiftyTwoWeekRange = await getFiftyTwoWeekRangeForCompanies(companyIds)

  const topMovers = computeTopMovers(positions)
  const dailyChangePct = computePortfolioDailyChangePct(positions, totals.currentValueCents)
  const alerts = computePortfolioAlerts(positions, totals, byCategory, patrimonyHistoryThisMonth)
  const opportunities = computeOpportunities(positions, fiftyTwoWeekRange)

  const heldCompanyIds = new Set(companyIds)
  const feedItems: RadarFeedItem[] = [
    ...buildFeedFromTimeline(timeline),
    ...buildPriceMoveFeedItems(positions),
    ...buildPriceMoveFeedItemsForFavorites(favorites, heldCompanyIds),
    ...alertsToFeedItems(alerts),
  ]

  const recentIncomeEvents = timeline.filter((event) => event.type === "DIVIDEND" || event.type === "JCP")

  return (
    <div className="space-y-6">
      {header}

      <RadarDailySummaryCard
        dailyChangePct={dailyChangePct}
        biggestGainer={
          topMovers.biggestGainer
            ? { ticker: topMovers.biggestGainer.position.ticker, value: topMovers.biggestGainer.value }
            : null
        }
        biggestLoser={
          topMovers.biggestLoser
            ? { ticker: topMovers.biggestLoser.position.ticker, value: topMovers.biggestLoser.value }
            : null
        }
        dividendsReceivedThisMonthCents={dividendsReceivedThisMonthCents}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PortfolioAlertsSection alerts={alerts} />
        <OpportunitiesSection opportunities={opportunities} />
      </div>

      <RadarFeed items={feedItems} />

      <UpcomingEventsSection />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DividendsRadarSection
          recentIncomeEvents={recentIncomeEvents}
          dividendsReceivedThisMonthCents={dividendsReceivedThisMonthCents}
        />
        <RadarAiCardSuspense profileId={profile.id} />
      </div>

      <EarningsRadarSection />
      <NewsRadarSection news={[]} />
    </div>
  )
}
