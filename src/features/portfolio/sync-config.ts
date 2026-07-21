/// Single source of truth for the portfolio's automatic price-refresh
/// behavior (PriceSyncStatus) — change a value here, nothing else needs
/// to change.

/// How often to check for stale prices while /carteira is open, and the
/// staleness threshold itself (the two are the same value on purpose — no
/// point polling faster than the data could plausibly have changed).
/// Set to 2 * 60_000 for a 2-minute cadence instead of 5.
export const REFRESH_INTERVAL_MS = 5 * 60_000

/// Master switch — set to false to disable the automatic background
/// refresh entirely (the status line still shows the last known sync time,
/// it just never triggers a new one on its own).
export const ENABLE_BACKGROUND_REFRESH = true
