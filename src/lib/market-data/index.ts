import "server-only"

import { BrapiProvider } from "@/lib/market-data/providers/brapi-provider"
import type { MarketDataProvider } from "@/lib/market-data/provider"

export type { MarketDataProvider } from "@/lib/market-data/provider"
export type {
  CompanyDetails,
  CompanyDirectoryEntry,
  DividendEvent,
  PriceRange,
  PricePoint,
} from "@/lib/market-data/types"

let cachedProvider: MarketDataProvider | undefined

/// Single switch point for the whole app — swapping market-data vendors
/// means adding a new provider class and a branch here, nothing else.
export function getMarketDataProvider(): MarketDataProvider {
  if (!cachedProvider) {
    const providerName = process.env.MARKET_DATA_PROVIDER ?? "brapi"

    switch (providerName) {
      case "brapi":
        cachedProvider = new BrapiProvider()
        break
      default:
        throw new Error(`Provedor de dados de mercado desconhecido: ${providerName}`)
    }
  }
  return cachedProvider
}
