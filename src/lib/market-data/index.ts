import "server-only"

import type { MarketDataProvider } from "@/lib/market-data/provider"
import { ProviderManager } from "@/lib/market-data/provider-manager"
import { buildProviderRegistry } from "@/lib/market-data/provider-registry"
import { BrapiProvider } from "@/lib/market-data/providers/brapi-provider"
import { YahooFinanceProvider } from "@/lib/market-data/providers/yahoo-finance-provider"

export type { MarketDataProvider, ProviderCapabilities } from "@/lib/market-data/provider"
export type {
  CompanyDetails,
  CompanyDirectoryEntry,
  DividendEvent,
  PriceRange,
  PricePoint,
} from "@/lib/market-data/types"

let cachedProvider: MarketDataProvider | undefined

// Lets MARKET_DATA_PROVIDER pin a single provider for isolated testing/
// debugging, bypassing ProviderManager's failover entirely.
const SINGLE_PROVIDERS: Record<string, () => MarketDataProvider> = {
  brapi: () => new BrapiProvider(),
  yahoo: () => new YahooFinanceProvider(),
}

/// Single switch point for the whole app. By default returns a
/// ProviderManager orchestrating the full multi-provider chain (see
/// provider-registry.ts) with automatic priority-ordered failover — every
/// existing caller (MarketDataService, the sync jobs) is unaffected, since
/// ProviderManager itself satisfies MarketDataProvider.
export function getMarketDataProvider(): MarketDataProvider {
  if (!cachedProvider) {
    const forcedProviderName = process.env.MARKET_DATA_PROVIDER

    if (forcedProviderName) {
      const buildProvider = SINGLE_PROVIDERS[forcedProviderName]
      if (!buildProvider) {
        throw new Error(`Provedor de dados de mercado desconhecido: ${forcedProviderName}`)
      }
      cachedProvider = buildProvider()
    } else {
      cachedProvider = new ProviderManager(buildProviderRegistry())
    }
  }
  return cachedProvider
}
