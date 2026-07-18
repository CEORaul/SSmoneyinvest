import "server-only"

import type { MarketDataProvider, ProviderCapabilities } from "@/lib/market-data/provider"
import {
  getProviderHealthMap,
  recordProviderFailure,
  recordProviderSuccess,
} from "@/lib/market-data/provider-health"
import type {
  CompanyDetails,
  CompanyDirectoryEntry,
  PriceRange,
} from "@/lib/market-data/types"

export interface ProviderRegistration {
  provider: MarketDataProvider
  /** Lower tries first. */
  priority: number
}

type Capability = keyof ProviderCapabilities

/// Composite `MarketDataProvider`: tries registered providers in priority
/// order for a given capability, skips any currently marked OFFLINE (see
/// provider-health.ts — ProviderHealth is in Postgres, not memory, because
/// this app runs as serverless functions with no shared in-process state
/// between invocations), and automatically fails over to the next candidate
/// on error.
///
/// Because this class itself implements `MarketDataProvider`, everything
/// that already calls `getMarketDataProvider()` — `MarketDataService`, the
/// sync jobs — gets multi-provider failover for free, with zero changes.
export class ProviderManager implements MarketDataProvider {
  readonly name = "provider-manager"
  readonly capabilities: ProviderCapabilities = { directory: true, details: true }

  constructor(private readonly registrations: ProviderRegistration[]) {}

  async listCompanyDirectory(): Promise<CompanyDirectoryEntry[]> {
    return this.executeWithFailover("directory", (provider) =>
      provider.listCompanyDirectory()
    )
  }

  async getCompanyDetails(
    ticker: string,
    range: PriceRange
  ): Promise<CompanyDetails | null> {
    return this.executeWithFailover("details", (provider) =>
      provider.getCompanyDetails(ticker, range)
    )
  }

  private async executeWithFailover<T>(
    capability: Capability,
    task: (provider: MarketDataProvider) => Promise<T>
  ): Promise<T> {
    const candidates = await this.rankCandidates(capability)
    if (candidates.length === 0) {
      throw new Error(`Nenhum provedor registrado suporta "${capability}"`)
    }

    let lastError: unknown
    for (const provider of candidates) {
      const start = Date.now()
      try {
        const result = await task(provider)
        await recordProviderSuccess(provider.name, Date.now() - start)
        return result
      } catch (error) {
        await recordProviderFailure(provider.name, Date.now() - start, error)
        lastError = error
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(`Todos os provedores falharam para "${capability}"`)
  }

  private async rankCandidates(capability: Capability): Promise<MarketDataProvider[]> {
    const capable = this.registrations
      .filter((registration) => registration.provider.capabilities[capability])
      .sort((a, b) => a.priority - b.priority)
      .map((registration) => registration.provider)

    if (capable.length <= 1) return capable

    const health = await getProviderHealthMap(capable.map((provider) => provider.name))
    const online = capable.filter(
      (provider) => health.get(provider.name)?.status !== "OFFLINE"
    )

    // If every candidate currently looks offline, try them anyway — a
    // stale/wrong health row shouldn't permanently lock everyone out.
    return online.length > 0 ? online : capable
  }
}
