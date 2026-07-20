const MARKET_TIMEZONE = "America/Sao_Paulo"
const MARKET_OPEN_HOUR = 10
const MARKET_CLOSE_HOUR = 18

/// Whether the B3 (Brazilian stock exchange) regular session is open —
/// Mon-Fri, 10:00-18:00 America/Sao_Paulo (covers the regular session plus
/// the closing auction/after-market, generous enough not to cut off real
/// trading activity a minute early). Uses Intl's timezone-aware formatting
/// rather than a hardcoded UTC offset, since Brazil has had no DST since
/// 2019 but a fixed offset would still be the wrong kind of assumption to
/// bake in. Ignores market holidays — a closed holiday just means the
/// automatic refresh finds no new prices to apply, not a wrong "open"
/// reading with real consequences.
export function isBrazilMarketOpen(date: Date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: MARKET_TIMEZONE,
    weekday: "short",
    hour: "numeric",
    hour12: false,
  }).formatToParts(date)

  const weekday = parts.find((part) => part.type === "weekday")?.value
  const hour = Number(parts.find((part) => part.type === "hour")?.value)

  const isWeekday = weekday != null && weekday !== "Sat" && weekday !== "Sun"
  return isWeekday && hour >= MARKET_OPEN_HOUR && hour < MARKET_CLOSE_HOUR
}
