import "server-only"

import type { ProviderRegistration } from "@/lib/market-data/provider-manager"
import { BrapiProvider } from "@/lib/market-data/providers/brapi-provider"
import { YahooFinanceProvider } from "@/lib/market-data/providers/yahoo-finance-provider"

/// The whole multi-provider chain in one place. Adding a new provider
/// (AlphaVantage, Finnhub, TwelveData, ...) means implementing
/// MarketDataProvider and adding one line here — nothing else in the app
/// changes, since ProviderManager and every caller only know about the
/// MarketDataProvider interface.
export function buildProviderRegistry(): ProviderRegistration[] {
  return [
    { provider: new BrapiProvider(), priority: 1 },
    { provider: new YahooFinanceProvider(), priority: 2 },
  ]
}
