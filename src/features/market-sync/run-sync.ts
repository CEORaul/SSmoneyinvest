import "server-only"

import type { SyncJobType } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"

export interface SyncJobResult {
  processed: number
  failed: number
  errors: string[]
}

/// Wraps a sync job with a SyncLog row — the audit trail requested for
/// "registrar logs de sincronização". Every job (company directory, company
/// details, and whatever gets added later) goes through this, so logging
/// behavior never has to be reimplemented per job.
export async function runSyncJob(
  type: SyncJobType,
  job: () => Promise<SyncJobResult>
) {
  const log = await prisma.syncLog.create({ data: { type, status: "RUNNING" } })

  try {
    const result = await job()
    const status =
      result.failed === 0 ? "SUCCESS" : result.processed > 0 ? "PARTIAL" : "FAILED"

    await prisma.syncLog.update({
      where: { id: log.id },
      data: {
        status,
        itemsProcessed: result.processed,
        itemsFailed: result.failed,
        errorMessage:
          result.errors.length > 0 ? result.errors.slice(0, 20).join("\n") : null,
        finishedAt: new Date(),
      },
    })

    return { ...result, status }
  } catch (error) {
    await prisma.syncLog.update({
      where: { id: log.id },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : String(error),
        finishedAt: new Date(),
      },
    })
    throw error
  }
}
