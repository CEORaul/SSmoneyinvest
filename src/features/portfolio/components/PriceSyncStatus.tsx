"use client"

import { RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { runCompanyDirectorySyncAction } from "@/features/admin/actions"
import { ENABLE_BACKGROUND_REFRESH, REFRESH_INTERVAL_MS } from "@/features/portfolio/sync-config"
import { isBrazilMarketOpen } from "@/lib/market-hours"
import { cn } from "@/lib/utils"
import { formatAbsoluteTime, formatRelativeTime } from "@/utils/format"

interface PriceSyncStatusProps {
  lastSyncedAt: Date | null
  /** Cryptomoedas negociam 24h — a carteira que tiver uma continua
   * atualizando fora do horário de pregão da B3, em vez de parar. */
  hasCrypto: boolean
}

const LABEL_TICK_MS = 5_000

/// Small status line + background refresh for /carteira — reuses the exact
/// same runCompanyDirectorySyncAction() the admin "Sincronizar Mercado"
/// button calls, so there is still only one implementation of the sync
/// trigger. Shows the last-known prices immediately (the page's own server
/// render already has them) and swaps in fresh ones via router.refresh()
/// once a sync completes, instead of a full page reload. Cadence and the
/// on/off switch live in features/portfolio/sync-config.ts.
export function PriceSyncStatus({ lastSyncedAt, hasCrypto }: PriceSyncStatusProps) {
  const router = useRouter()
  const [syncedAt, setSyncedAt] = useState(lastSyncedAt)
  const [isSyncing, setIsSyncing] = useState(false)
  const [, forceTick] = useState(0)
  const isSyncingRef = useRef(false)

  useEffect(() => {
    if (!ENABLE_BACKGROUND_REFRESH) return

    // Crypto trades around the clock, so a portfolio holding any keeps
    // refreshing 24/7; a stocks/FIIs-only portfolio only bothers during
    // the B3 session — outside it the last close is already correct.
    function shouldConsiderRefresh() {
      return hasCrypto || isBrazilMarketOpen()
    }

    async function maybeSync() {
      if (isSyncingRef.current || !shouldConsiderRefresh()) return

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only re-run when syncedAt/hasCrypto change; router/maybeSync are stable enough for this polling loop
  }, [syncedAt, hasCrypto])

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
