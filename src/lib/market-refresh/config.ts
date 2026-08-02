/// Single source of truth for how often SSmoney's UI silently refreshes
/// market data (preço, variação, volume, market cap) without reloading the
/// page. Every consumer — the shared LiveMarketStore, the useLiveMarketPrice
/// hook, and the "Atualização automática" indicator — reads from here, so
/// changing the cadence (1min/2min/15min/tempo real) is a one-line edit
/// below, never a project-wide search-and-replace.

export type MarketRefreshPreset = "1m" | "2m" | "5m" | "15m" | "realtime"

interface MarketRefreshPresetConfig {
  intervalMs: number
  label: string
}

const MARKET_REFRESH_PRESETS: Record<MarketRefreshPreset, MarketRefreshPresetConfig> = {
  "1m": { intervalMs: 60_000, label: "Atualização automática a cada 1 minuto" },
  "2m": { intervalMs: 2 * 60_000, label: "Atualização automática a cada 2 minutos" },
  "5m": { intervalMs: 5 * 60_000, label: "Atualização automática a cada 5 minutos" },
  "15m": { intervalMs: 15 * 60_000, label: "Atualização automática a cada 15 minutos" },
  realtime: { intervalMs: 5_000, label: "Atualização em tempo real" },
}

/// The only line to change to speed up/slow down every live market-data
/// surface in the app at once — no other file in src/ hardcodes an
/// interval or a label.
const ACTIVE_PRESET: MarketRefreshPreset = "5m"

export const MARKET_REFRESH_INTERVAL_MS = MARKET_REFRESH_PRESETS[ACTIVE_PRESET].intervalMs
export const MARKET_REFRESH_LABEL = MARKET_REFRESH_PRESETS[ACTIVE_PRESET].label

/// Safety cap on ids fetched per refresh tick — not a realistic ceiling (a
/// single open page realistically watches dozens of tickers, never
/// thousands), just a guarantee that one unusually large page can never
/// turn a routine refresh into an unbounded query.
export const MARKET_REFRESH_MAX_BATCH = 200
