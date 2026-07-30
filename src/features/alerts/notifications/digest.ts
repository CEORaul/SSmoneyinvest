import "server-only"

import { getPriceHistoryForCompanies } from "@/features/comparator/queries"
import { computeNotificationPriority } from "@/features/alerts/notifications/priority"
import { NotificationService } from "@/features/alerts/notifications/service"
import { getPatrimonyHistory, type PatrimonyPoint } from "@/features/portfolio/analytics"
import { computeTopMovers } from "@/features/portfolio/insights"
import { getPortfolioSummary, type PortfolioPositionRow } from "@/features/portfolio/queries"
import { computeOpportunities, computePortfolioDailyChangePct } from "@/features/radar/insights"
import { getFiftyTwoWeekRangeForCompanies } from "@/features/radar/queries"
import { prisma } from "@/lib/prisma"
import { formatCurrencyCents } from "@/utils/format"

/// A move under this magnitude is normal daily noise (mirrors the same
/// threshold radar/insights.ts uses for its own feed cards) — not worth a
/// "sua carteira subiu/caiu hoje" FinIA insight.
const DAILY_MOVE_THRESHOLD_PCT = 3
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

const brtDateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" })
const brtWeekdayFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", weekday: "short" })

function brtDateKey(date = new Date()): string {
  return brtDateFormatter.format(date)
}

function isSundayInBrt(date = new Date()): boolean {
  return brtWeekdayFormatter.format(date) === "Sun"
}

async function alreadyNotified(profileId: string, sourceKey: string): Promise<boolean> {
  const existing = await prisma.radarNotification.findFirst({ where: { profileId, sourceKey }, select: { id: true } })
  return existing != null
}

async function getDailyOpportunities(positions: PortfolioPositionRow[]) {
  const rangeByCompany = await getFiftyTwoWeekRangeForCompanies(positions.map((p) => p.companyId))
  return computeOpportunities(positions, rangeByCompany)
}

/// "Resumo do Dia" (spec's RESUMO DIÁRIO) — every stat is reused/computed
/// from data this app already trusts elsewhere (portfolio summary, top
/// movers, real Transaction rows, the bell's own NEWS notification count),
/// never an LLM call. Gated by sourceKey BEFORE any computation runs, so a
/// second bell-open on the same calendar day (America/Sao_Paulo) costs one
/// cheap findFirst, not a full portfolio recompute.
export async function ensureDailyDigest(profileId: string): Promise<void> {
  const sourceKey = `digest-daily:${brtDateKey()}`
  if (await alreadyNotified(profileId, sourceKey)) return

  const { positions, totals } = await getPortfolioSummary(profileId)
  if (positions.length === 0) return

  const topMovers = computeTopMovers(positions)
  const changePct = computePortfolioDailyChangePct(positions, totals.currentValueCents)

  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)

  const [dividendsToday, newsToday, opportunities] = await Promise.all([
    prisma.transaction.aggregate({
      where: { profileId, type: { in: ["DIVIDEND", "JCP"] }, date: { gte: dayStart } },
      _sum: { totalCents: true },
    }),
    prisma.radarNotification.count({ where: { profileId, type: "NEWS", createdAt: { gte: dayStart } } }),
    getDailyOpportunities(positions),
  ])

  await NotificationService.create({
    profileId,
    type: "PORTFOLIO",
    priority: "LOW",
    title: "Resumo do Dia",
    body: `Carteira ${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}% hoje.`,
    metadata: {
      digestKind: "DAILY",
      portfolioChangePct: changePct,
      biggestGainerTicker: topMovers.biggestGainer?.position.ticker ?? null,
      biggestGainerPct: topMovers.biggestGainer?.value ?? null,
      biggestLoserTicker: topMovers.biggestLoser?.position.ticker ?? null,
      biggestLoserPct: topMovers.biggestLoser?.value ?? null,
      dividendsAnnouncedCents: Number(dividendsToday._sum.totalCents ?? 0),
      newsCount: newsToday,
      radarOpportunitiesCount: opportunities.length,
    },
    sourceKey,
  })
}

function computeWeeklyReturnPct(history: PatrimonyPoint[], weekAgoMs: number): number {
  if (history.length === 0) return 0
  const latest = history[history.length - 1]

  let closest: PatrimonyPoint | null = null
  for (const point of history) {
    const t = new Date(point.date).getTime()
    if (t > weekAgoMs) continue
    if (!closest || t > new Date(closest.date).getTime()) closest = point
  }
  if (!closest || closest.valueCents <= 0) return 0
  return ((latest.valueCents - closest.valueCents) / closest.valueCents) * 100
}

interface WeeklyMover {
  ticker: string
  pct: number
}

/// Same "closest point at-or-before the target date" algorithm the news
/// feature's performance.ts already uses for its 7d/30d/52-semanas cards —
/// reimplemented locally (not imported) since that helper is private to
/// news/performance.ts and scoped to its own NewsPerformanceSnapshot shape.
function computeWeeklyMovers(
  positions: PortfolioPositionRow[],
  priceHistoryByCompany: Map<string, { date: Date; closeCents: number }[]>,
  weekAgoMs: number
): { gainer: WeeklyMover | null; loser: WeeklyMover | null } {
  const changes: WeeklyMover[] = []

  for (const position of positions) {
    const points = priceHistoryByCompany.get(position.companyId) ?? []
    let closest: { date: Date; closeCents: number } | null = null
    for (const point of points) {
      if (point.date.getTime() > weekAgoMs) continue
      if (!closest || point.date.getTime() > closest.date.getTime()) closest = point
    }
    if (!closest || closest.closeCents <= 0) continue
    changes.push({ ticker: position.ticker, pct: ((position.currentPriceCents - closest.closeCents) / closest.closeCents) * 100 })
  }

  if (changes.length === 0) return { gainer: null, loser: null }
  return {
    gainer: changes.reduce((a, b) => (b.pct > a.pct ? b : a)),
    loser: changes.reduce((a, b) => (b.pct < a.pct ? b : a)),
  }
}

/// "Resumo da Semana" (spec's RESUMO SEMANAL) — only ever fires on a Sunday
/// (America/Sao_Paulo), same sourceKey-gated-before-computation shape as the
/// daily digest.
export async function ensureWeeklyDigest(profileId: string): Promise<void> {
  if (!isSundayInBrt()) return

  const sourceKey = `digest-weekly:${brtDateKey()}`
  if (await alreadyNotified(profileId, sourceKey)) return

  const { positions } = await getPortfolioSummary(profileId)
  if (positions.length === 0) return

  const weekAgo = new Date(Date.now() - WEEK_MS)
  const companyIds = positions.map((p) => p.companyId)

  const [patrimonyHistory, dividendsWeek, newBuys, alertsTriggered, priceHistoryByCompany] = await Promise.all([
    getPatrimonyHistory(profileId, "3M"),
    prisma.transaction.aggregate({
      where: { profileId, type: { in: ["DIVIDEND", "JCP"] }, date: { gte: weekAgo } },
      _sum: { totalCents: true },
    }),
    prisma.transaction.findMany({
      where: { profileId, type: "BUY", date: { gte: weekAgo } },
      distinct: ["companyId"],
      select: { companyId: true },
    }),
    prisma.radarNotification.count({ where: { profileId, type: "ALERT", createdAt: { gte: weekAgo } } }),
    getPriceHistoryForCompanies(companyIds, "1M"),
  ])

  const weeklyReturnPct = computeWeeklyReturnPct(patrimonyHistory, weekAgo.getTime())
  const weeklyMovers = computeWeeklyMovers(positions, priceHistoryByCompany, weekAgo.getTime())

  await NotificationService.create({
    profileId,
    type: "PORTFOLIO",
    priority: "LOW",
    title: "Resumo da Semana",
    body: `Rentabilidade da semana: ${weeklyReturnPct >= 0 ? "+" : ""}${weeklyReturnPct.toFixed(2)}%.`,
    metadata: {
      digestKind: "WEEKLY",
      weeklyReturnPct,
      dividendsCents: Number(dividendsWeek._sum.totalCents ?? 0),
      newBuysCount: newBuys.length,
      alertsTriggeredCount: alertsTriggered,
      biggestGainerTicker: weeklyMovers.gainer?.ticker ?? null,
      biggestGainerPct: weeklyMovers.gainer?.pct ?? null,
      biggestLoserTicker: weeklyMovers.loser?.ticker ?? null,
      biggestLoserPct: weeklyMovers.loser?.pct ?? null,
    },
    sourceKey,
  })
}

/// "Sua carteira subiu 3,2% hoje" / "Seu patrimônio atingiu um novo
/// recorde" (spec's FINIA section) — both rule-based facts, never an LLM
/// call, computed from data already trusted elsewhere (computeTopMovers'
/// own daily-change formula, getPatrimonyHistory's real value series).
/// "Sua diversificação melhorou" and "você recebeu novos dividendos" are
/// NOT produced here: the former would need a historical diversification-
/// score time series this app doesn't retain yet, and the latter already
/// fires event-driven from recordIncomeAction (see actions.ts) rather than
/// on this once-a-day pass.
export async function ensureDailyFiniaInsights(profileId: string): Promise<void> {
  const dateKey = brtDateKey()
  const moveSourceKey = `finia-move:${dateKey}`
  const recordSourceKey = `finia-record:${dateKey}`

  const [moveDone, recordDone] = await Promise.all([
    alreadyNotified(profileId, moveSourceKey),
    alreadyNotified(profileId, recordSourceKey),
  ])
  if (moveDone && recordDone) return

  const { positions, totals } = await getPortfolioSummary(profileId)
  if (positions.length === 0) return

  if (!moveDone) {
    const changePct = computePortfolioDailyChangePct(positions, totals.currentValueCents)
    if (Math.abs(changePct) >= DAILY_MOVE_THRESHOLD_PCT) {
      await NotificationService.create({
        profileId,
        type: "FINIA",
        priority: computeNotificationPriority("FINIA", { isMilestone: true }),
        title: changePct >= 0 ? "Sua carteira subiu hoje" : "Sua carteira caiu hoje",
        body: `Variação de ${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}% hoje.`,
        metadata: { insightKind: "DAILY_MOVE", changePct },
        sourceKey: moveSourceKey,
      })
    }
  }

  if (!recordDone) {
    const history = await getPatrimonyHistory(profileId, "MAX")
    if (history.length > 0) {
      const latest = history[history.length - 1]
      const previousMax = Math.max(0, ...history.slice(0, -1).map((p) => p.valueCents))
      if (latest.valueCents > previousMax) {
        await NotificationService.create({
          profileId,
          type: "FINIA",
          priority: computeNotificationPriority("FINIA", { isMilestone: true }),
          title: "Seu patrimônio atingiu um novo recorde",
          body: `Patrimônio atual: ${formatCurrencyCents(latest.valueCents)}.`,
          metadata: { insightKind: "PATRIMONY_RECORD", valueCents: latest.valueCents },
          sourceKey: recordSourceKey,
        })
      }
    }
  }
}

/// "Radar encontrou um ativo compatível com seus filtros" — one notification
/// per day picking the first result from the same computeOpportunities the
/// /radar page's own "Oportunidades" section already renders (52-week
/// high/low proximity), never a second/duplicate computation.
export async function ensureDailyRadarOpportunity(profileId: string): Promise<void> {
  const sourceKey = `radar-opportunity:${brtDateKey()}`
  if (await alreadyNotified(profileId, sourceKey)) return

  const { positions } = await getPortfolioSummary(profileId)
  if (positions.length === 0) return

  const opportunities = await getDailyOpportunities(positions)
  if (opportunities.length === 0) return

  const top = opportunities[0]
  await NotificationService.create({
    profileId,
    type: "RADAR_OPPORTUNITY",
    title: "O Radar encontrou uma oportunidade",
    body: top.text,
    companyId: top.companyId,
    metadata: { opportunityKey: top.key, totalOpportunities: opportunities.length },
    sourceKey,
  })
}
