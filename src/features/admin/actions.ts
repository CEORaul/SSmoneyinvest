"use server"

import { getLastDirectorySyncStatus } from "@/features/market-sync/sync-status"
import { syncCompanyDetails } from "@/features/market-sync/sync-company-details"
import { syncCompanyDirectory } from "@/features/market-sync/sync-company-directory"
import { requireUser } from "@/lib/auth/session"

export interface SyncActionResult {
  ok: boolean
  processed?: number
  failed?: number
  errors?: string[]
  error?: string
  /** True when this call was a no-op because a directory sync is already
   * running or one just finished — see runCompanyDirectorySyncAction(). */
  skipped?: boolean
}

// Guards every caller (admin button, portfolio page's background refresh,
// and any future restored cron) against triggering redundant directory
// syncs within a few seconds of each other or of one another finishing.
const MIN_INTERVAL_MS = 20_000

function toErrorResult(error: unknown): SyncActionResult {
  const message = error instanceof Error ? error.message : "Não foi possível concluir a sincronização."
  return { ok: false, error: message }
}

/// Manual trigger for the same job `/api/cron/companies` runs — reuses
/// syncCompanyDirectory() directly rather than calling the route over HTTP,
/// so there is exactly one implementation of the sync logic regardless of
/// which caller (the admin button, the portfolio page's automatic
/// background refresh, or a future restored cron schedule) invokes it.
/// Auth is by logged-in session here instead of CRON_SECRET, since a
/// person/browser tab is triggering this, not Vercel Cron hitting a route.
export async function runCompanyDirectorySyncAction(): Promise<SyncActionResult> {
  await requireUser()

  const status = await getLastDirectorySyncStatus()
  const justRan =
    status.lastSyncedAt != null && Date.now() - status.lastSyncedAt.getTime() < MIN_INTERVAL_MS
  if (status.isSyncing || justRan) {
    return { ok: true, processed: 0, failed: 0, errors: [], skipped: true }
  }

  try {
    const result = await syncCompanyDirectory()
    return { ok: true, processed: result.processed, failed: result.failed, errors: result.errors }
  } catch (error) {
    return toErrorResult(error)
  }
}

/// Manual trigger for the same job `/api/cron/company-details` runs — see
/// runCompanyDirectorySyncAction() above. Only processes one batch (25
/// companies, oldest-synced first) per call, same as the cron route.
export async function runCompanyDetailsSyncAction(): Promise<SyncActionResult> {
  await requireUser()
  try {
    const result = await syncCompanyDetails()
    return { ok: true, processed: result.processed, failed: result.failed, errors: result.errors }
  } catch (error) {
    return toErrorResult(error)
  }
}
