import "server-only"

import type { MarketDataProvider, ProviderCapabilities } from "@/lib/market-data/provider"
import {
  OFFLINE_RETRY_COOLDOWN_MS,
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

  /// Not part of the MarketDataProvider interface — a deliberate escape
  /// hatch for callers that need to compare two providers' answers for the
  /// same ticker (data-quality validation), rather than simple failover.
  /// Named lookup, not priority-ordered, since the caller already knows
  /// which provider it wants a second opinion from.
  async getCompanyDetailsFrom(
    providerName: string,
    ticker: string,
    range: PriceRange
  ): Promise<CompanyDetails | null> {
    const registration = this.registrations.find(
      (candidate) => candidate.provider.name === providerName
    )
    if (!registration) {
      throw new Error(`Provedor desconhecido: ${providerName}`)
    }

    const start = Date.now()
    try {
      const result = await registration.provider.getCompanyDetails(ticker, range)
      await recordProviderSuccess(providerName, Date.now() - start)
      return result
    } catch (error) {
      await recordProviderFailure(providerName, Date.now() - start, error)
      throw error
    }
  }

  /// Priority-ordered list of every registered provider's name, for
  /// callers implementing "try the next one" logic of their own (e.g.
  /// data-quality re-checks) on top of the normal failover.
  listRegisteredProviderNames(): string[] {
    return [...this.registrations].sort((a, b) => a.priority - b.priority).map((r) => r.provider.name)
  }

  private async rankCandidates(capability: Capability): Promise<MarketDataProvider[]> {
    const capable = this.registrations
      .filter((registration) => registration.provider.capabilities[capability])
      .sort((a, b) => a.priority - b.priority)
      .map((registration) => registration.provider)

    if (capable.length <= 1) return capable

    const health = await getProviderHealthMap(capable.map((provider) => provider.name))
    const now = Date.now()

    const eligible = capable.filter((provider) => {
      const snapshot = health.get(provider.name)
      if (!snapshot || snapshot.status !== "OFFLINE") return true
      // Half-open: an OFFLINE provider still gets probed again once the
      // cooldown has passed, even while a lower-priority provider is
      // healthy — otherwise a recovered BRAPI would stay bypassed forever
      // unless Yahoo also failed. Priority ordering means BRAPI, once
      // eligible again, is tried before Yahoo — automatic return to the
      // primary source, no manual intervention.
      return now - snapshot.lastCheckedAt.getTime() >= OFFLINE_RETRY_COOLDOWN_MS
    })

    // If every candidate currently looks offline and ineligible for a
    // probe yet, try them all anyway — a stale/wrong health row shouldn't
    // permanently lock everyone out.
    return eligible.length > 0 ? eligible : capable
  }
}
