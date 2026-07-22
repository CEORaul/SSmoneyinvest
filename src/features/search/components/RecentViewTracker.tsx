"use client"

import { useEffect } from "react"

import type { AssetClass } from "@/generated/prisma/client"
import { addLocalRecentView, type LocalHistoryItem } from "@/features/search/local-history"

interface RecentViewTrackerProps {
  isAuthenticated: boolean
  company: {
    id: string
    ticker: string
    name: string
    logoUrl: string | null
    assetClass: AssetClass
    priceCents: number
    priceChangePct: number
  }
}

/// Renders nothing — its only job is recording "this ticker was viewed"
/// into localStorage for an anonymous visitor. A logged-in visitor's view
/// is already recorded server-side (logAssetView, called from the page's
/// own Server Component render), so this deliberately no-ops when
/// isAuthenticated to avoid double-tracking across two different stores.
export function RecentViewTracker({ isAuthenticated, company }: RecentViewTrackerProps) {
  useEffect(() => {
    if (isAuthenticated) return
    const item: LocalHistoryItem = {
      id: company.id,
      ticker: company.ticker,
      name: company.name,
      logoUrl: company.logoUrl,
      assetClass: company.assetClass,
      priceCents: company.priceCents,
      changePct: company.priceChangePct,
    }
    addLocalRecentView(item)
    // Only the identity of the viewed company should re-trigger this —
    // price/name refreshing in place shouldn't re-log the same view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, company.id])

  return null
}
