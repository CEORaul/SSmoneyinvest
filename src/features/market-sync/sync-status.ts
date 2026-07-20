import "server-only"

import { prisma } from "@/lib/prisma"

export interface SyncStatusInfo {
  lastSyncedAt: Date | null
  isSyncing: boolean
}

/// Reads the most recent COMPANY_DIRECTORY SyncLog rows — the same log
/// table every directory sync (cron, admin button, or the portfolio page's
/// background refresh) already writes to via runSyncJob(). No separate
/// "last synced" tracking mechanism needed.
export async function getLastDirectorySyncStatus(): Promise<SyncStatusInfo> {
  const [lastCompleted, running] = await Promise.all([
    prisma.syncLog.findFirst({
      where: { type: "COMPANY_DIRECTORY", status: { not: "RUNNING" } },
      orderBy: { finishedAt: "desc" },
    }),
    prisma.syncLog.findFirst({
      where: { type: "COMPANY_DIRECTORY", status: "RUNNING" },
      orderBy: { startedAt: "desc" },
    }),
  ])

  return {
    lastSyncedAt: lastCompleted?.finishedAt ?? null,
    isSyncing: running != null,
  }
}
