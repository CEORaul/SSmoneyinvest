import "server-only"

import type { MarketFilters, MarketSortOption, SavedMarketFilterSummary } from "@/features/market/discovery-types"
import { prisma } from "@/lib/prisma"

/// "Meus filtros" — a named MarketFilters+MarketSortOption snapshot per
/// profile. Stored as Json since the filter shape is still evolving (see
/// discovery-types.ts); rehydrated as-is, never re-validated against a
/// schema here — a filter saved before a new field was added just omits
/// that field on read (the field's default already handles "not set").

export async function getSavedMarketFilters(profileId: string): Promise<SavedMarketFilterSummary[]> {
  const rows = await prisma.savedMarketFilter.findMany({
    where: { profileId },
    orderBy: { createdAt: "desc" },
  })
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    filters: row.filters as unknown as MarketFilters,
    sort: (row.sort as MarketSortOption | null) ?? "relevancia",
    createdAt: row.createdAt.toISOString(),
  }))
}

export async function saveMarketFilter(
  profileId: string,
  name: string,
  filters: MarketFilters,
  sort: MarketSortOption
): Promise<void> {
  await prisma.savedMarketFilter.upsert({
    where: { profileId_name: { profileId, name } },
    update: { filters: filters as object, sort },
    create: { profileId, name, filters: filters as object, sort },
  })
}

export async function deleteMarketFilter(profileId: string, id: string): Promise<void> {
  await prisma.savedMarketFilter.deleteMany({ where: { id, profileId } })
}
