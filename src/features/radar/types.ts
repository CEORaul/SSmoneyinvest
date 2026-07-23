/// Shared shapes for every /radar section — kept separate from queries.ts
/// so components can import types without pulling in "server-only" code.

export type RadarFeedItemType =
  | "PRICE_UP"
  | "PRICE_DOWN"
  | "BUY"
  | "SELL"
  | "DIVIDEND"
  | "JCP"
  | "BONUS"
  | "SPLIT"
  | "REVERSE_SPLIT"
  | "ALERT"

/// The four filter buckets the Radar filter bar groups RadarFeedItemType
/// into (point 13 of the spec) — RESULTADOS/NOTICIAS have no populating
/// source yet, so they're valid filter values that just currently match
/// zero feed items, never removed from the UI (an empty result is honest;
/// hiding the filter option would look like a missing feature).
export type RadarFeedCategory = "DIVIDENDOS" | "RESULTADOS" | "ALERTAS" | "NOTICIAS" | "EVENTOS"

/// "carteira" for anything derived from a held position or a real
/// transaction; "favorito" only for a price-move card about a ticker the
/// user favorited but doesn't hold (a held+favorited ticker shows once,
/// under "carteira" — see buildPriceMoveFeedItemsForFavorites).
export type RadarFeedScope = "carteira" | "favorito"

export interface RadarFeedItem {
  id: string
  type: RadarFeedItemType
  category: RadarFeedCategory
  scope: RadarFeedScope
  ticker: string | null
  name: string | null
  logoUrl: string | null
  title: string
  description: string
  /// ISO timestamp — real event dates for transactions/price moves, "now"
  /// for alerts (a point-in-time fact about current state, not a dated
  /// historical event).
  date: string
  href: string | null
}

export type RadarAlertTone = "info" | "warning"

export interface RadarAlert {
  key: string
  text: string
  tone: RadarAlertTone
  href: string | null
}

export interface RadarOpportunity {
  key: string
  text: string
  href: string
}

export type RadarUpcomingEventKind =
  | "DIVIDENDOS"
  | "JSCP"
  | "RESULTADOS"
  | "ASSEMBLEIAS"
  | "BONIFICACOES"
  | "SPLITS"
  | "GRUPAMENTOS"
  | "IPOS"
  | "TESOURO"

export interface RadarUpcomingEventPlaceholder {
  kind: RadarUpcomingEventKind
  label: string
  status: "Aguardando sincronização"
}

export interface RadarNewsItem {
  title: string
  companyTicker: string
  companyName: string
  publishedAt: string
  source: string
  summary: string
  url: string
}
