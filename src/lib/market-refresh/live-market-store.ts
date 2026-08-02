import { getLiveMarketPricesAction } from "@/features/market/live-prices-actions"
import { MARKET_REFRESH_INTERVAL_MS } from "@/lib/market-refresh/config"

export interface LiveMarketSnapshot {
  priceCents: number
  priceChangePct: number
  volume: bigint | null
  marketCapCents: bigint | null
}

type Listener = () => void

function snapshotsEqual(a: LiveMarketSnapshot, b: LiveMarketSnapshot): boolean {
  return (
    a.priceCents === b.priceCents &&
    a.priceChangePct === b.priceChangePct &&
    a.volume === b.volume &&
    a.marketCapCents === b.marketCapCents
  )
}

/// LiveMarketStore — the ONE place a browser tab schedules market-data
/// refresh timers ("não criar um timer independente em cada componente" /
/// "criar um mecanismo centralizado"). Every component that needs a live
/// price subscribes by company id through useLiveMarketPrice; the store
/// keeps a single shared reference count per id, runs exactly one
/// setInterval (started on first subscriber, stopped when the last one
/// unsubscribes), coalesces every currently-watched id into one batched
/// Server Action call per tick, and only notifies the listeners of an id
/// whose snapshot actually changed — nothing re-renders when nothing
/// changed. A module-level singleton is safe here because it's only ever
/// touched from client components (see useLiveMarketPrice's own doc
/// comment on why seeding happens in an effect, never during render/SSR).
class LiveMarketStore {
  private snapshots = new Map<string, LiveMarketSnapshot>()
  private listeners = new Map<string, Set<Listener>>()
  private refCounts = new Map<string, number>()
  private timer: ReturnType<typeof setInterval> | null = null
  private inFlight = false

  getSnapshot(id: string): LiveMarketSnapshot | undefined {
    return this.snapshots.get(id)
  }

  /// Idempotent — only fills in a value the store doesn't already have, so
  /// a component's own server-rendered initial value always wins until the
  /// first real refresh tick corrects it.
  seed(id: string, snapshot: LiveMarketSnapshot): void {
    if (!this.snapshots.has(id)) this.snapshots.set(id, snapshot)
  }

  subscribe(id: string, listener: Listener): () => void {
    this.refCounts.set(id, (this.refCounts.get(id) ?? 0) + 1)
    const set = this.listeners.get(id) ?? new Set<Listener>()
    set.add(listener)
    this.listeners.set(id, set)
    this.ensureTimer()

    return () => {
      set.delete(listener)
      if (set.size === 0) this.listeners.delete(id)

      const remaining = (this.refCounts.get(id) ?? 1) - 1
      if (remaining <= 0) {
        this.refCounts.delete(id)
        this.snapshots.delete(id)
      } else {
        this.refCounts.set(id, remaining)
      }

      if (this.refCounts.size === 0) this.stopTimer()
    }
  }

  private ensureTimer(): void {
    if (this.timer) return
    this.timer = setInterval(() => void this.refresh(), MARKET_REFRESH_INTERVAL_MS)
  }

  private stopTimer(): void {
    if (!this.timer) return
    clearInterval(this.timer)
    this.timer = null
  }

  /// One request per tick for every id any mounted component currently
  /// cares about — never one request per component. Skipped entirely
  /// while a previous tick is still in flight, so a slow response can
  /// never stack overlapping requests.
  private async refresh(): Promise<void> {
    if (this.inFlight) return
    const ids = [...this.refCounts.keys()]
    if (ids.length === 0) return

    this.inFlight = true
    try {
      const fresh = await getLiveMarketPricesAction(ids)
      for (const row of fresh) {
        const next: LiveMarketSnapshot = {
          priceCents: row.priceCents,
          priceChangePct: row.priceChangePct,
          volume: row.volume,
          marketCapCents: row.marketCapCents,
        }
        const prev = this.snapshots.get(row.id)
        if (prev && snapshotsEqual(prev, next)) continue

        this.snapshots.set(row.id, next)
        this.listeners.get(row.id)?.forEach((listener) => listener())
      }
    } catch {
      // Best-effort — a failed tick silently tries again next interval,
      // never surfaces as a UI error (the refresh must stay invisible).
    } finally {
      this.inFlight = false
    }
  }
}

// Module-duplication guard. This module runs in the BROWSER (unlike
// src/lib/prisma/index.ts's superficially similar globalThis pattern,
// which guards a Node server process and only needs to apply in dev, since
// a production Node process never re-evaluates its modules). A browser
// bundle has no such guarantee either way — the bundler can still emit
// more than one copy of this module across chunks — so the guard must
// stay active unconditionally in every environment, not just dev.
const globalForLiveMarketStore = globalThis as unknown as { liveMarketStore: LiveMarketStore | undefined }

export const liveMarketStore = globalForLiveMarketStore.liveMarketStore ?? new LiveMarketStore()

globalForLiveMarketStore.liveMarketStore = liveMarketStore
