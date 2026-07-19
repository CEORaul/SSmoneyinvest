import "server-only"

import type { ProviderRegistration } from "@/lib/market-data/provider-manager"
import { BrapiProvider } from "@/lib/market-data/providers/brapi-provider"
import { YahooFinanceProvider } from "@/lib/market-data/providers/yahoo-finance-provider"

// Priority is read from env with these as defaults — BRAPI (official
// source) first, Yahoo (failover-only) second. Re-priotizing an already-
// registered provider is then a Vercel env var change, not a code change.
// Registering a genuinely NEW provider (Finnhub, TwelveData, ...) still
// needs one line here, same as before — env vars can reorder providers
// that exist, not conjure ones that don't.
const DEFAULT_PRIORITIES: Record<string, number> = {
  BRAPI: 1,
  YAHOO: 2,
}

function resolvePriority(envKey: keyof typeof DEFAULT_PRIORITIES): number {
  const raw = process.env[`MARKET_DATA_PRIORITY_${envKey}`]
  const parsed = raw != null ? Number(raw) : NaN
  return Number.isFinite(parsed) ? parsed : DEFAULT_PRIORITIES[envKey]
}

/// The whole multi-provider chain in one place. Adding a new provider
/// (AlphaVantage, Finnhub, TwelveData, ...) means implementing
/// MarketDataProvider and adding one line here — nothing else in the app
/// changes, since ProviderManager and every caller only know about the
/// MarketDataProvider interface.
export function buildProviderRegistry(): ProviderRegistration[] {
  return [
    { provider: new BrapiProvider(), priority: resolvePriority("BRAPI") },
    { provider: new YahooFinanceProvider(), priority: resolvePriority("YAHOO") },
  ]
}
