"use server"

import type { AssetClass } from "@/generated/prisma/client"
import { getFavoriteCompanies } from "@/features/company/queries"
import {
  getMegaMenuData,
  getRecentSearches,
  getRecentViews,
  getTopByVolume,
  getTrendingAssets,
  searchAssets,
  type GlobalSearchResult,
  type MegaMenuData,
} from "@/features/search/queries"
import { getTopDividendPayers, getTopGainers } from "@/features/market/queries"
import { getPortfolioSummary } from "@/features/portfolio/queries"
import { getOptionalProfile } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import type { CompanyListItem } from "@/types"

const SEARCH_DEBOUNCE_LIMIT = 20

export async function searchAssetsAction(query: string): Promise<GlobalSearchResult[]> {
  return searchAssets(query, SEARCH_DEBOUNCE_LIMIT)
}

export interface SearchDropdownDefaults {
  isAuthenticated: boolean
  trending: GlobalSearchResult[]
  favorites: GlobalSearchResult[]
  portfolio: GlobalSearchResult[]
  /// null (not []) when logged out — tells the client "use localStorage
  /// instead", distinct from "logged in but genuinely has none yet".
  recentSearches: GlobalSearchResult[] | null
  recentViews: GlobalSearchResult[] | null
  popularDividendPayers: CompanyListItem[]
  popularGainers: CompanyListItem[]
  popularByVolume: CompanyListItem[]
}

/// Everything the empty-state dropdown needs, in one round trip — used by
/// both the Hero's inline search (fetched server-side, passed as initial
/// props) and the Navbar's modal search (fetched client-side on open,
/// since the modal has no server-rendered initial paint of its own).
export async function getSearchDropdownDefaultsAction(): Promise<SearchDropdownDefaults> {
  const profile = await getOptionalProfile()

  const [trending, favorites, portfolioSummary, recentSearches, recentViews, popularDividendPayers, popularGainers, popularByVolume] =
    await Promise.all([
      getTrendingAssets(6),
      profile ? getFavoriteCompanies(profile.id) : Promise.resolve([]),
      profile ? getPortfolioSummary(profile.id) : Promise.resolve(null),
      profile ? getRecentSearches(profile.id, 8) : Promise.resolve(null),
      profile ? getRecentViews(profile.id, 8) : Promise.resolve(null),
      getTopDividendPayers(6),
      getTopGainers(6),
      getTopByVolume(6),
    ])

  return {
    isAuthenticated: !!profile,
    trending,
    favorites: favorites.map((company) => ({
      id: company.id,
      ticker: company.ticker,
      name: company.name,
      logoUrl: company.logoUrl,
      assetClass: company.assetClass,
      sector: company.sector,
      priceCents: company.priceCents,
      changePct: company.changePct,
    })),
    portfolio: (portfolioSummary?.positions ?? []).slice(0, 8).map((position) => ({
      id: position.companyId,
      ticker: position.ticker,
      name: position.name,
      logoUrl: position.logoUrl,
      assetClass: position.assetClass,
      sector: null,
      priceCents: position.currentPriceCents,
      changePct: position.priceChangePct,
    })),
    recentSearches,
    recentViews,
    popularDividendPayers,
    popularGainers,
    popularByVolume,
  }
}

/// Backs the Navbar mega menu — one category's real top companies + real
/// sectors, lazy-fetched the first time that menu opens.
export async function getMegaMenuDataAction(assetClass: AssetClass): Promise<MegaMenuData> {
  return getMegaMenuData(assetClass)
}

/// Fire-and-forget log of a search-result selection — never blocks
/// navigation (the client calls this without awaiting), and never throws
/// into the caller since a logging failure must not break search itself.
export async function logSearchSelectionAction(companyId: string, query: string): Promise<void> {
  const profile = await getOptionalProfile()
  try {
    await prisma.searchLog.create({
      data: { companyId, profileId: profile?.id ?? null, kind: "SEARCH", query: query.slice(0, 200) },
    })
  } catch {
    // Logging is best-effort — a failed insert here must never surface as
    // a broken search experience.
  }
}
