"use client"

import { RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { runCompanyDirectorySyncAction } from "@/features/admin/actions"
import { ENABLE_BACKGROUND_REFRESH, REFRESH_INTERVAL_MS } from "@/features/portfolio/sync-config"
import { cn } from "@/lib/utils"
import { formatAbsoluteTime, formatRelativeTime } from "@/utils/format"

interface PriceSyncStatusProps {
  lastSyncedAt: Date | null
}

const LABEL_TICK_MS = 5_000

/// Small status line + background refresh for /carteira — reuses the exact
/// same runCompanyDirectorySyncAction() the admin "Sincronizar Mercado"
/// button calls, so there is still only one implementation of the sync
/// trigger. Shows the last-known prices immediately (the page's own server
/// render already has them) and swaps in fresh ones via router.refresh()
/// once a sync completes, instead of a full page reload. Cadence and the
/// on/off switch live in features/portfolio/sync-config.ts. Runs purely on
/// staleness (>REFRESH_INTERVAL_MS since last sync) — no market-hours or
/// asset-class gating, since BRAPI's directory sync is a single batched
/// call regardless of what's in the portfolio, and gating it previously
/// caused non-crypto portfolios to never refresh outside B3 session hours.
export function PriceSyncStatus({ lastSyncedAt }: PriceSyncStatusProps) {
  const router = useRouter()
  const [syncedAt, setSyncedAt] = useState(lastSyncedAt)
  const [isSyncing, setIsSyncing] = useState(false)
  const [, forceTick] = useState(0)
  const isSyncingRef = useRef(false)

  useEffect(() => {
    if (!ENABLE_BACKGROUND_REFRESH) return

    async function maybeSync() {
      if (isSyncingRef.current) return

      const neverSynced = syncedAt === null
      const stale = neverSynced || Date.now() - syncedAt!.getTime() > REFRESH_INTERVAL_MS
      if (!stale) return

      isSyncingRef.current = true
      setIsSyncing(true)
      const result = await runCompanyDirectorySyncAction()
      isSyncingRef.current = false
      setIsSyncing(false)

      if (result.ok && !result.skipped) {
        setSyncedAt(new Date())
        router.refresh()
      }
    }

    maybeSync()
    const pollId = setInterval(maybeSync, REFRESH_INTERVAL_MS)
    const labelTickId = setInterval(() => forceTick((n) => n + 1), LABEL_TICK_MS)

    return () => {
      clearInterval(pollId)
      clearInterval(labelTickId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only re-run when syncedAt changes; router/maybeSync are stable enough for this polling loop
  }, [syncedAt])

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <RefreshCw className={cn("size-3", isSyncing && "animate-spin")} />
      {isSyncing ? (
        <span>Atualizando preços...</span>
      ) : syncedAt ? (
        <span title={`Última atualização: ${formatAbsoluteTime(syncedAt)}`}>
          Atualizado {formatRelativeTime(syncedAt)}
        </span>
      ) : (
        <span>Aguardando primeira sincronização</span>
      )}
    </div>
  )
}
