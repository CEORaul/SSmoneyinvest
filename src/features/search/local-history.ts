"use client"

import type { AssetClass } from "@/generated/prisma/client"

/// Client-only mirror of GlobalSearchResult, trimmed to what a history
/// entry needs to render a row later — used only for anonymous visitors.
/// A logged-in visitor's history lives in Postgres (SearchLog) instead;
/// see logAssetView/logSearchSelectionAction.
export interface LocalHistoryItem {
  id: string
  ticker: string
  name: string
  logoUrl: string | null
  assetClass: AssetClass
  priceCents: number
  changePct: number
}

const MAX_ITEMS = 10
const SEARCHES_KEY = "ssmoney:recent-searches"
const VIEWS_KEY = "ssmoney:recent-views"

function readList(key: string): LocalHistoryItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeList(key: string, items: LocalHistoryItem[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(key, JSON.stringify(items.slice(0, MAX_ITEMS)))
  } catch {
    // localStorage can throw (private browsing quota, disabled storage) —
    // history is a nice-to-have, never worth breaking the page for.
  }
}

function pushDistinct(key: string, item: LocalHistoryItem) {
  const current = readList(key).filter((existing) => existing.ticker !== item.ticker)
  writeList(key, [item, ...current])
}

export function getLocalRecentSearches(): LocalHistoryItem[] {
  return readList(SEARCHES_KEY)
}

export function addLocalRecentSearch(item: LocalHistoryItem): void {
  pushDistinct(SEARCHES_KEY, item)
}

export function getLocalRecentViews(): LocalHistoryItem[] {
  return readList(VIEWS_KEY)
}

export function addLocalRecentView(item: LocalHistoryItem): void {
  pushDistinct(VIEWS_KEY, item)
}
