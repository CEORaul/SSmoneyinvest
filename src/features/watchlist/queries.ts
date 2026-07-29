import "server-only"

import type { AssetClass } from "@/generated/prisma/client"
import { getTrailingDividendYieldMap } from "@/features/market/dividend-yield"
import { computeWeeklyMonthlyChanges } from "@/features/watchlist/price-changes"
import type { WatchlistItemRow, WatchlistStats, WatchlistSummary } from "@/features/watchlist/types"
import { prisma } from "@/lib/prisma"

/// Distinct companies tracked across every list a profile owns — used by
/// /noticias to scope the "Monitor de Ativos" tab. A general-purpose
/// cross-feature query, not tied to any single watchlist.
export async function getWatchlistedCompanyIds(profileId: string): Promise<string[]> {
  const rows = await prisma.watchlistItem.findMany({
    where: { watchlist: { profileId } },
    select: { companyId: true },
    distinct: ["companyId"],
  })
  return rows.map((row) => row.companyId)
}

export async function getWatchlistsForProfile(profileId: string): Promise<WatchlistSummary[]> {
  const rows = await prisma.watchlist.findMany({
    where: { profileId },
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: "asc" },
  })

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    color: row.color,
    itemCount: row._count.items,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }))
}

/// Ownership check used by every watchlist Server Action before mutating —
/// never trust a client-supplied watchlistId without confirming it belongs
/// to the requesting profile.
export async function getWatchlistOwnedByProfile(id: string, profileId: string) {
  return prisma.watchlist.findFirst({ where: { id, profileId }, select: { id: true } })
}

/// Every displayed field is read live off Company (plus the same batched
/// dividend-yield/price-history helpers the rest of the app already uses)
/// — a WatchlistItem only ever stores the (watchlist, company) link itself,
/// so an item can never go stale relative to /mercado or /empresa.
export async function getWatchlistItems(watchlistId: string, profileId: string): Promise<WatchlistItemRow[]> {
  const items = await prisma.watchlistItem.findMany({
    where: { watchlistId, watchlist: { profileId } },
    include: { company: true },
    orderBy: { addedAt: "desc" },
  })
  if (items.length === 0) return []

  const companies = items.map((item) => ({ id: item.companyId, priceCents: item.company.priceCents }))
  const companyIds = companies.map((c) => c.id)

  const [dividendYields, changes, alertCounts, favorites] = await Promise.all([
    getTrailingDividendYieldMap(companies),
    computeWeeklyMonthlyChanges(companies),
    prisma.priceAlert.groupBy({
      by: ["companyId"],
      where: { profileId, companyId: { in: companyIds }, status: { not: "CANCELED" } },
      _count: { _all: true },
    }),
    prisma.favorite.findMany({ where: { profileId, companyId: { in: companyIds } }, select: { companyId: true } }),
  ])

  const alertCountByCompany = new Map(alertCounts.map((row) => [row.companyId, row._count._all]))
  const favoritedSet = new Set(favorites.map((row) => row.companyId))

  return items.map((item) => {
    const change = changes.get(item.companyId)
    return {
      id: item.id,
      watchlistId: item.watchlistId,
      companyId: item.companyId,
      ticker: item.company.ticker,
      name: item.company.name,
      logoUrl: item.company.logoUrl,
      assetClass: item.company.assetClass,
      priceSource: item.company.priceSource,
      sector: item.company.sector,
      priceCents: item.company.priceCents,
      dailyChangePct: Number(item.company.priceChangePct),
      weeklyChangePct: change?.weeklyChangePct ?? null,
      monthlyChangePct: change?.monthlyChangePct ?? null,
      dayHighCents: item.company.dayHighCents,
      dayLowCents: item.company.dayLowCents,
      fiftyTwoWeekHighCents: item.company.fiftyTwoWeekHighCents,
      fiftyTwoWeekLowCents: item.company.fiftyTwoWeekLowCents,
      volume: item.company.volume,
      marketCapCents: item.company.marketCapCents,
      dividendYieldPct: dividendYields.get(item.companyId) ?? 0,
      alertsCount: alertCountByCompany.get(item.companyId) ?? 0,
      isFavorited: favoritedSet.has(item.companyId),
      addedAt: item.addedAt.toISOString(),
    }
  })
}

/// Aggregated across every list the profile owns (not just the one open in
/// the UI) — backs the stats row at the top of /watchlist. A company tracked
/// in more than one list is only counted once in totalAssetCount/topGainer/
/// topLoser/classDistribution (it's the same real asset either way); alerts
/// are similarly counted once per company, not once per list membership.
export async function computeWatchlistStats(profileId: string): Promise<WatchlistStats> {
  const [listCount, items] = await Promise.all([
    prisma.watchlist.count({ where: { profileId } }),
    prisma.watchlistItem.findMany({
      where: { watchlist: { profileId } },
      include: {
        company: {
          select: { id: true, ticker: true, name: true, logoUrl: true, priceChangePct: true, assetClass: true },
        },
      },
    }),
  ])

  const byCompany = new Map(items.map((item) => [item.companyId, item.company]))
  const companies = [...byCompany.values()]

  if (companies.length === 0) {
    return { listCount, totalAssetCount: 0, topGainer: null, topLoser: null, activeAlertsCount: 0, classDistribution: [] }
  }

  let topGainer = companies[0]
  let topLoser = companies[0]
  for (const company of companies) {
    if (Number(company.priceChangePct) > Number(topGainer.priceChangePct)) topGainer = company
    if (Number(company.priceChangePct) < Number(topLoser.priceChangePct)) topLoser = company
  }

  const activeAlertsCount = await prisma.priceAlert.count({
    where: { profileId, status: "ACTIVE", companyId: { in: companies.map((c) => c.id) } },
  })

  const classCounts = new Map<AssetClass, number>()
  for (const company of companies) {
    classCounts.set(company.assetClass, (classCounts.get(company.assetClass) ?? 0) + 1)
  }

  return {
    listCount,
    totalAssetCount: companies.length,
    topGainer: {
      companyId: topGainer.id,
      ticker: topGainer.ticker,
      name: topGainer.name,
      logoUrl: topGainer.logoUrl,
      changePct: Number(topGainer.priceChangePct),
    },
    topLoser: {
      companyId: topLoser.id,
      ticker: topLoser.ticker,
      name: topLoser.name,
      logoUrl: topLoser.logoUrl,
      changePct: Number(topLoser.priceChangePct),
    },
    activeAlertsCount,
    classDistribution: [...classCounts.entries()].map(([assetClass, count]) => ({ assetClass, count })),
  }
}
