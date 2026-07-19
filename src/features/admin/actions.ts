"use server"

import { syncCompanyDetails } from "@/features/market-sync/sync-company-details"
import { syncCompanyDirectory } from "@/features/market-sync/sync-company-directory"
import { requireUser } from "@/lib/auth/session"

export interface SyncActionResult {
  ok: boolean
  processed?: number
  failed?: number
  errors?: string[]
  error?: string
}

function toErrorResult(error: unknown): SyncActionResult {
  const message = error instanceof Error ? error.message : "Não foi possível concluir a sincronização."
  return { ok: false, error: message }
}

/// Manual trigger for the same job `/api/cron/companies` runs — reuses
/// syncCompanyDirectory() directly rather than calling the route over HTTP,
/// so there is exactly one implementation of the sync logic regardless of
/// which of the three callers (this action, the cron route, a future
/// restored cron schedule) invokes it. Auth is by logged-in session here
/// instead of CRON_SECRET, since a person is clicking a button, not Vercel
/// Cron hitting a route.
export async function runCompanyDirectorySyncAction(): Promise<SyncActionResult> {
  await requireUser()
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
