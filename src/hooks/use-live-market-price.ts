"use client"

import { useCallback, useEffect, useState, useSyncExternalStore } from "react"

import { liveMarketStore, type LiveMarketSnapshot } from "@/lib/market-refresh/live-market-store"

export interface LiveMarketPriceInput {
  id: string
  priceCents: number
  priceChangePct?: number
  volume?: bigint | null
  marketCapCents?: bigint | null
}

function toSnapshot(input: LiveMarketPriceInput): LiveMarketSnapshot {
  return {
    priceCents: input.priceCents,
    priceChangePct: input.priceChangePct ?? 0,
    volume: input.volume ?? null,
    marketCapCents: input.marketCapCents ?? null,
  }
}

/// The only way a component reads a live-refreshed market value. Seeds the
/// shared LiveMarketStore with this page's own server-rendered initial
/// value, then subscribes to that one company id — the store itself owns
/// the single shared timer and batched request (see live-market-store.ts),
/// so mounting this hook in N components watching the same id costs zero
/// extra requests.
export function useLiveMarketPrice(input: LiveMarketPriceInput): LiveMarketSnapshot {
  // Captured once on mount via React's lazy-useState-initializer idiom —
  // never reassigned on later renders. Mutating a ref's .current during
  // render (an earlier version of this hook did) is explicitly flagged by
  // React's own lint rules as unsafe: it can make a component fail to
  // update as expected. useState's lazy initializer is the React-blessed
  // way to compute a value once without that risk, and it matches the
  // store's own seed() contract — only the component's FIRST known value
  // should ever seed the store, never a later render's props.
  const [initial] = useState(() => toSnapshot(input))

  useEffect(() => {
    liveMarketStore.seed(input.id, initial)
  }, [input.id, initial])

  // React's own docs: a new `subscribe` function identity on every render
  // makes useSyncExternalStore unsubscribe-and-resubscribe on every render,
  // not just on mount — costly here since subscribe/unsubscribe touch
  // shared refCount/timer bookkeeping. Keyed only by id (and the
  // mount-stable `initial`), so it stays stable across every re-render
  // that doesn't actually change which company this instance watches.
  const subscribe = useCallback(
    (onChange: () => void) => liveMarketStore.subscribe(input.id, onChange),
    [input.id]
  )
  const getSnapshot = useCallback(() => liveMarketStore.getSnapshot(input.id) ?? initial, [input.id, initial])
  const getServerSnapshot = useCallback(() => initial, [initial])

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
