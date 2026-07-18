import "server-only"

import type { ProviderStatus } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"

// Three failures in a row before ProviderManager stops routing new
// requests to a provider — one-off blips (a single timeout) shouldn't take
// a provider out of rotation, but a real outage should.
const OFFLINE_THRESHOLD = 3

export interface ProviderHealthSnapshot {
  providerName: string
  status: ProviderStatus
  consecutiveFailures: number
  lastError: string | null
}

/// Called once per provider call attempt, success or failure — the single
/// place that keeps ProviderHealth (Postgres, not memory: see the
/// serverless-instance reasoning in market-data-provider-manager) accurate.
export async function recordProviderSuccess(
  providerName: string,
  latencyMs: number
): Promise<void> {
  const existing = await prisma.providerHealth.findUnique({ where: { providerName } })
  // Exponential moving average — smooths out one-off slow requests without
  // needing to store every latency sample.
  const avgLatencyMs = existing?.avgLatencyMs
    ? Math.round(existing.avgLatencyMs * 0.8 + latencyMs * 0.2)
    : latencyMs

  await prisma.providerHealth.upsert({
    where: { providerName },
    update: {
      status: "ONLINE",
      consecutiveFailures: 0,
      totalRequests: { increment: 1 },
      lastLatencyMs: latencyMs,
      avgLatencyMs,
      lastError: null,
      lastSuccessAt: new Date(),
      lastCheckedAt: new Date(),
    },
    create: {
      providerName,
      status: "ONLINE",
      totalRequests: 1,
      lastLatencyMs: latencyMs,
      avgLatencyMs: latencyMs,
      lastSuccessAt: new Date(),
    },
  })
}

export async function recordProviderFailure(
  providerName: string,
  latencyMs: number,
  error: unknown
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error)
  const existing = await prisma.providerHealth.findUnique({ where: { providerName } })
  const consecutiveFailures = (existing?.consecutiveFailures ?? 0) + 1
  const status: ProviderStatus =
    consecutiveFailures >= OFFLINE_THRESHOLD ? "OFFLINE" : "DEGRADED"

  await prisma.providerHealth.upsert({
    where: { providerName },
    update: {
      status,
      consecutiveFailures,
      totalRequests: { increment: 1 },
      totalFailures: { increment: 1 },
      lastLatencyMs: latencyMs,
      lastError: message,
      lastCheckedAt: new Date(),
    },
    create: {
      providerName,
      status,
      consecutiveFailures,
      totalRequests: 1,
      totalFailures: 1,
      lastLatencyMs: latencyMs,
      lastError: message,
    },
  })
}

export async function getProviderHealthMap(
  providerNames: string[]
): Promise<Map<string, ProviderHealthSnapshot>> {
  const rows = await prisma.providerHealth.findMany({
    where: { providerName: { in: providerNames } },
  })
  return new Map(rows.map((row) => [row.providerName, row]))
}
