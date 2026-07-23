import { translateSector } from "@/features/company/sector-labels"
import type { TimelineEvent, PatrimonyPoint } from "@/features/portfolio/analytics"
import type { PortfolioCategoryGroup, PortfolioPositionRow, PortfolioTotals } from "@/features/portfolio/queries"
import type {
  RadarAlert,
  RadarFeedItem,
  RadarOpportunity,
  RadarUpcomingEventKind,
  RadarUpcomingEventPlaceholder,
} from "@/features/radar/types"

/// Pure functions over already-fetched real data (Transaction-derived
/// TimelineEvent[], PortfolioPositionRow[], PatrimonyPoint[]) — no Prisma
/// access here, mirrors src/features/portfolio/insights.ts's convention.
/// Every alert/opportunity either surfaces a real computed fact or doesn't
/// render at all; nothing here ever invents a number.

const TRANSACTION_FEED_CATEGORY: Record<TimelineEvent["type"], RadarFeedItem["category"]> = {
  BUY: "EVENTOS",
  SELL: "EVENTOS",
  DIVIDEND: "DIVIDENDOS",
  JCP: "DIVIDENDOS",
  BONUS: "EVENTOS",
  SPLIT: "EVENTOS",
  REVERSE_SPLIT: "EVENTOS",
}

const TRANSACTION_FEED_TYPE: Record<TimelineEvent["type"], RadarFeedItem["type"]> = {
  BUY: "BUY",
  SELL: "SELL",
  DIVIDEND: "DIVIDEND",
  JCP: "JCP",
  BONUS: "BONUS",
  SPLIT: "SPLIT",
  REVERSE_SPLIT: "REVERSE_SPLIT",
}

const TRANSACTION_TITLE: Record<TimelineEvent["type"], (ticker: string) => string> = {
  BUY: (t) => `Compra de ${t}`,
  SELL: (t) => `Venda de ${t}`,
  DIVIDEND: (t) => `${t} pagou dividendos`,
  JCP: (t) => `${t} pagou JSCP`,
  BONUS: (t) => `${t} bonificação`,
  SPLIT: (t) => `${t} desdobramento`,
  REVERSE_SPLIT: (t) => `${t} grupamento`,
}

/// Backs both the Feed (point 2) and the Timeline (point 10) sections —
/// the spec describes near-identical chronological groupings, so this is
/// the one function both read from rather than two parallel derivations of
/// the same Transaction data.
export function buildFeedFromTimeline(events: TimelineEvent[]): RadarFeedItem[] {
  return events.map((event) => ({
    id: `tx-${event.id}`,
    type: TRANSACTION_FEED_TYPE[event.type],
    category: TRANSACTION_FEED_CATEGORY[event.type],
    scope: "carteira",
    ticker: event.ticker,
    name: event.name,
    logoUrl: event.logoUrl,
    title: TRANSACTION_TITLE[event.type](event.ticker),
    description:
      event.type === "DIVIDEND" || event.type === "JCP"
        ? `${event.quantity} un. — ${(event.totalCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
        : `${event.quantity} un.`,
    date: event.date,
    href: `/empresa/${event.ticker}`,
  }))
}

// A move under this magnitude is normal daily noise, not something worth a
// feed card — keeps "PETR4 subiu 4%" meaningful rather than every position
// generating a card every single day.
const PRICE_MOVE_FEED_THRESHOLD_PCT = 2

/// Company.priceChangePct is the current day's move — real, synced data —
/// dated by lastUpdatedAt (the actual sync timestamp), never backdated or
/// fabricated into a historical series.
export function buildPriceMoveFeedItems(positions: PortfolioPositionRow[]): RadarFeedItem[] {
  return positions
    .filter((p) => Math.abs(p.priceChangePct) >= PRICE_MOVE_FEED_THRESHOLD_PCT)
    .map((p) => {
      const isUp = p.priceChangePct >= 0
      const pctLabel = `${isUp ? "+" : ""}${p.priceChangePct.toFixed(2)}%`
      return {
        id: `price-${p.companyId}`,
        type: (isUp ? "PRICE_UP" : "PRICE_DOWN") as RadarFeedItem["type"],
        category: "EVENTOS" as const,
        scope: "carteira" as const,
        ticker: p.ticker,
        name: p.name,
        logoUrl: p.logoUrl,
        title: `${p.ticker} ${isUp ? "subiu" : "caiu"} ${Math.abs(p.priceChangePct).toFixed(2)}%`,
        description: `Variação do dia: ${pctLabel}`,
        date: p.lastUpdatedAt.toISOString(),
        href: `/empresa/${p.ticker}`,
      }
    })
}

export interface FavoriteCompanyPriceInfo {
  id: string
  ticker: string
  name: string
  logoUrl: string | null
  changePct: number
}

/// Same threshold/shape as buildPriceMoveFeedItems, for tickers the user
/// favorited but doesn't hold — excludes anything in heldCompanyIds so a
/// held+favorited ticker only ever shows once (as its "carteira" card).
export function buildPriceMoveFeedItemsForFavorites(
  favorites: FavoriteCompanyPriceInfo[],
  heldCompanyIds: Set<string>
): RadarFeedItem[] {
  return favorites
    .filter((f) => !heldCompanyIds.has(f.id) && Math.abs(f.changePct) >= PRICE_MOVE_FEED_THRESHOLD_PCT)
    .map((f) => {
      const isUp = f.changePct >= 0
      return {
        id: `price-fav-${f.id}`,
        type: (isUp ? "PRICE_UP" : "PRICE_DOWN") as RadarFeedItem["type"],
        category: "EVENTOS" as const,
        scope: "favorito" as const,
        ticker: f.ticker,
        name: f.name,
        logoUrl: f.logoUrl,
        title: `${f.ticker} ${isUp ? "subiu" : "caiu"} ${Math.abs(f.changePct).toFixed(2)}%`,
        description: `Variação do dia: ${isUp ? "+" : ""}${f.changePct.toFixed(2)}%`,
        date: new Date().toISOString(),
        href: `/empresa/${f.ticker}`,
      }
    })
}

export function alertsToFeedItems(alerts: RadarAlert[]): RadarFeedItem[] {
  return alerts.map((alert) => ({
    id: `alert-${alert.key}`,
    type: "ALERT",
    category: "ALERTAS",
    scope: "carteira",
    ticker: null,
    name: null,
    logoUrl: null,
    title: alert.text,
    description: "Alerta automático da carteira",
    date: new Date().toISOString(),
    href: alert.href,
  }))
}

export interface FeedBucket {
  label: string
  items: RadarFeedItem[]
}

/// Hoje/Ontem/Últimos 7 dias/Este mês/Este ano/Mais antigo — the shared
/// bucketing for both the Feed and Timeline sections.
export function groupFeedByBucket(items: RadarFeedItem[]): FeedBucket[] {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfYesterday.getDate() - 1)
  const sevenDaysAgo = new Date(startOfToday)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfYear = new Date(now.getFullYear(), 0, 1)

  const buckets: FeedBucket[] = [
    { label: "Hoje", items: [] },
    { label: "Ontem", items: [] },
    { label: "Últimos 7 dias", items: [] },
    { label: "Este mês", items: [] },
    { label: "Este ano", items: [] },
    { label: "Mais antigo", items: [] },
  ]

  const sorted = [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  for (const item of sorted) {
    const date = new Date(item.date)
    if (date >= startOfToday) buckets[0].items.push(item)
    else if (date >= startOfYesterday) buckets[1].items.push(item)
    else if (date >= sevenDaysAgo) buckets[2].items.push(item)
    else if (date >= startOfMonth) buckets[3].items.push(item)
    else if (date >= startOfYear) buckets[4].items.push(item)
    else buckets[5].items.push(item)
  }

  return buckets.filter((bucket) => bucket.items.length > 0)
}

/// Portfolio-wide "hoje a carteira valorizou X%" — value-weighted mean of
/// each position's own daily priceChangePct, the exact same weighting
/// formula groupPositionsByCategory already uses per-category (queries.ts),
/// just applied across every position instead of one category at a time.
export function computePortfolioDailyChangePct(
  positions: PortfolioPositionRow[],
  totalCurrentValueCents: number
): number {
  if (totalCurrentValueCents <= 0) return 0
  return (
    positions.reduce((sum, p) => sum + p.priceChangePct * p.currentValueCents, 0) / totalCurrentValueCents
  )
}

// Within 1 percentage point of the target counts as "no alvo" elsewhere in
// this app (see rebalancing.ts) — these Radar thresholds follow the same
// spirit of "only flag when it's a real, noteworthy deviation."
const LARGEST_POSITION_ALERT_THRESHOLD_PCT = 30
const SECTOR_CONCENTRATION_ALERT_THRESHOLD_PCT = 60
const SECTOR_EXCLUSIVE_THRESHOLD_PCT = 90
const MONTHLY_DRAWDOWN_ALERT_THRESHOLD_PCT = -3
// Categories a diversified equity+funds portfolio commonly holds — flagged
// only when the user already holds STOCK (so a crypto-only or just-started
// portfolio doesn't get a barrage of "you don't have X yet" noise).
const DIVERSIFICATION_CATEGORIES: { value: "FII" | "ETF"; label: string }[] = [
  { value: "FII", label: "FIIs" },
  { value: "ETF", label: "ETFs" },
]

/// Every figure here comes straight off getPortfolioSummary/getPatrimonyHistory
/// (both already computed off PortfolioService-maintained data) — this
/// function only picks thresholds and phrases sentences, never re-derives a
/// position's value/quantity itself.
export function computePortfolioAlerts(
  positions: PortfolioPositionRow[],
  totals: PortfolioTotals,
  byCategory: PortfolioCategoryGroup[],
  patrimonyHistoryThisMonth: PatrimonyPoint[]
): RadarAlert[] {
  const alerts: RadarAlert[] = []
  if (positions.length === 0) return alerts

  const largest = positions.reduce((a, b) => (b.currentValueCents > a.currentValueCents ? b : a))
  if (largest.allocationPct >= LARGEST_POSITION_ALERT_THRESHOLD_PCT) {
    alerts.push({
      key: "largest-position",
      text: `Sua maior posição (${largest.ticker}) representa ${largest.allocationPct.toFixed(0)}% da carteira.`,
      tone: "warning",
      href: `/empresa/${largest.ticker}`,
    })
  }

  const sectorTotals = new Map<string, number>()
  let sectoredValueCents = 0
  for (const position of positions) {
    if (!position.sector) continue
    sectorTotals.set(position.sector, (sectorTotals.get(position.sector) ?? 0) + position.currentValueCents)
    sectoredValueCents += position.currentValueCents
  }
  if (sectoredValueCents > 0) {
    const [topSector, topSectorValue] = [...sectorTotals.entries()].reduce((a, b) => (b[1] > a[1] ? b : a))
    const sectorPct = (topSectorValue / sectoredValueCents) * 100
    const label = translateSector(topSector)
    if (sectorPct >= SECTOR_EXCLUSIVE_THRESHOLD_PCT) {
      alerts.push({
        key: "sector-exclusive",
        text: `Você possui apenas ativos do setor ${label}.`,
        tone: "warning",
        href: null,
      })
    } else if (sectorPct >= SECTOR_CONCENTRATION_ALERT_THRESHOLD_PCT) {
      alerts.push({
        key: "sector-concentration",
        text: `Sua carteira está concentrada no setor ${label} (${sectorPct.toFixed(0)}%).`,
        tone: "warning",
        href: null,
      })
    }
  }

  const hasStock = byCategory.some((group) => group.category === "STOCK")
  if (hasStock) {
    for (const category of DIVERSIFICATION_CATEGORIES) {
      const has = byCategory.some((group) => group.category === category.value)
      if (!has) {
        alerts.push({
          key: `missing-${category.value}`,
          text: `Você ainda não possui ${category.label} em sua carteira.`,
          tone: "info",
          href: null,
        })
      }
    }
  }

  if (patrimonyHistoryThisMonth.length >= 2) {
    const first = patrimonyHistoryThisMonth[0]
    const last = patrimonyHistoryThisMonth[patrimonyHistoryThisMonth.length - 1]
    if (first.valueCents > 0) {
      const changePct = ((last.valueCents - first.valueCents) / first.valueCents) * 100
      if (changePct <= MONTHLY_DRAWDOWN_ALERT_THRESHOLD_PCT) {
        alerts.push({
          key: "monthly-drawdown",
          text: `Seu patrimônio caiu ${Math.abs(changePct).toFixed(1)}% este mês.`,
          tone: "warning",
          href: null,
        })
      }
    }
  }

  return alerts
}

// Within 3% of the 52-week extreme counts as "close" — matches how
// Investidor10/TradingView-style "near the high/low" facts are usually framed.
const FIFTY_TWO_WEEK_PROXIMITY_PCT = 3

/// Purely factual, never a buy/sell recommendation (see spec point 9) —
/// only emitted when Company.fiftyTwoWeekHigh/LowCents is actually populated
/// (a real detail-sync field, see market-data-service.ts), never estimated.
export function computeOpportunities(
  positions: PortfolioPositionRow[],
  rangeByCompany: Map<string, { highCents: number | null; lowCents: number | null }>
): RadarOpportunity[] {
  const opportunities: RadarOpportunity[] = []

  for (const position of positions) {
    const range = rangeByCompany.get(position.companyId)
    if (!range) continue

    if (range.highCents != null && range.highCents > 0) {
      const distanceFromHighPct = ((range.highCents - position.currentPriceCents) / range.highCents) * 100
      if (distanceFromHighPct >= 0 && distanceFromHighPct <= FIFTY_TWO_WEEK_PROXIMITY_PCT) {
        opportunities.push({
          key: `${position.companyId}-high`,
          text: `${position.ticker} está a ${distanceFromHighPct.toFixed(1)}% da máxima de 52 semanas.`,
          href: `/empresa/${position.ticker}`,
        })
      }
    }
    if (range.lowCents != null && range.lowCents > 0) {
      const distanceFromLowPct = ((position.currentPriceCents - range.lowCents) / range.lowCents) * 100
      if (distanceFromLowPct >= 0 && distanceFromLowPct <= FIFTY_TWO_WEEK_PROXIMITY_PCT) {
        opportunities.push({
          key: `${position.companyId}-low`,
          text: `${position.ticker} está a ${distanceFromLowPct.toFixed(1)}% da mínima de 52 semanas.`,
          href: `/empresa/${position.ticker}`,
        })
      }
    }
  }

  return opportunities
}

const UPCOMING_EVENT_LABELS: Record<RadarUpcomingEventKind, string> = {
  DIVIDENDOS: "Dividendos",
  JSCP: "JSCP",
  RESULTADOS: "Resultados",
  ASSEMBLEIAS: "Assembleias",
  BONIFICACOES: "Bonificações",
  SPLITS: "Splits",
  GRUPAMENTOS: "Grupamentos",
  IPOS: "IPOs",
  TESOURO: "Tesouro",
}

/// No financial calendar/earnings provider is wired up yet — every category
/// honestly reports "Aguardando sincronização" rather than a fabricated
/// date. Once a real calendar sync exists, this is the one place that
/// would start returning real dates per kind.
export function getUpcomingEventPlaceholders(): RadarUpcomingEventPlaceholder[] {
  return (Object.keys(UPCOMING_EVENT_LABELS) as RadarUpcomingEventKind[]).map((kind) => ({
    kind,
    label: UPCOMING_EVENT_LABELS[kind],
    status: "Aguardando sincronização",
  }))
}
