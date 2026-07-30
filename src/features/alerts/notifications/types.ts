import type { AssetClass, PriceSource, RadarPriority, RadarType } from "@/generated/prisma/client"

export type { RadarPriority, RadarType }

/// One row in the notification bell — a RadarNotification joined with just
/// the Company fields a card needs (ticker/name/logoUrl plus the trio
/// CreateAlertDialog/TradeDialog need for their own "initialCompany" prop,
/// same reasoning as NewsMatchedCompany), so the UI never has to re-fetch
/// the asset for a quick action. `metadata` is the type-specific quick-
/// action/context payload (see RadarNotification's own doc in
/// schema.prisma) — callers narrow it per `type` rather than this file
/// modeling every shape.
export interface NotificationRow {
  id: string
  type: RadarType
  priority: RadarPriority
  title: string
  body: string | null
  companyId: string | null
  ticker: string | null
  name: string | null
  logoUrl: string | null
  assetClass: AssetClass | null
  priceCents: number | null
  priceSource: PriceSource | null
  metadata: Record<string, unknown> | null
  isRead: boolean
  isPinned: boolean
  groupCount: number
  createdAt: string
  updatedAt: string
}

export interface NotificationFeedResult {
  notifications: NotificationRow[]
  nextCursor: string | null
}

export interface NotificationActionResult {
  ok: boolean
  error?: string
}

/// The filter bar's fixed set — "Todas"/"Não lidas" aren't RadarType-based
/// (they read isRead / ignore type entirely), every other filter maps to
/// one or more RadarType values via NOTIFICATION_TYPE_FILTER below.
export type NotificationFilterKey =
  | "all"
  | "unread"
  | "alerts"
  | "news"
  | "dividends"
  | "earnings"
  | "radar"
  | "agenda"
  | "portfolio"
  | "finia"

export const NOTIFICATION_FILTER_ORDER: NotificationFilterKey[] = [
  "all",
  "unread",
  "alerts",
  "news",
  "dividends",
  "earnings",
  "radar",
  "agenda",
  "portfolio",
  "finia",
]

export const NOTIFICATION_FILTER_LABELS: Record<NotificationFilterKey, string> = {
  all: "Todas",
  unread: "Não lidas",
  alerts: "Alertas",
  news: "Notícias",
  dividends: "Dividendos",
  earnings: "Resultados",
  radar: "Radar",
  agenda: "Agenda",
  portfolio: "Carteira",
  finia: "FinIA",
}

/// Which RadarType values a given (non-all/unread) filter matches — a
/// filter can span more than one type (e.g. "Dividendos" covers both
/// DIVIDEND and JCP payouts).
export const NOTIFICATION_FILTER_TYPES: Partial<Record<NotificationFilterKey, RadarType[]>> = {
  alerts: ["ALERT"],
  news: ["NEWS"],
  dividends: ["DIVIDEND", "JCP"],
  earnings: ["EARNINGS"],
  radar: ["RADAR_OPPORTUNITY", "INDICATOR_CHANGE"],
  agenda: ["ASSEMBLY", "IPO", "TREASURY"],
  portfolio: ["PORTFOLIO", "PRICE_MOVE", "BUY", "SELL", "BONUS", "SPLIT", "REVERSE_SPLIT"],
  finia: ["FINIA"],
}

/// Emoji + label per spec's "TIPOS DE NOTIFICAÇÃO" section — purely
/// presentational metadata, read by NotificationItem.tsx to render the
/// card's icon/type line. ACHIEVEMENT has no producer yet (see schema.prisma
/// RadarType doc) but is listed here already so the bell renders it
/// correctly the day a real one is created.
export const NOTIFICATION_TYPE_META: Record<RadarType, { emoji: string; label: string }> = {
  PRICE_MOVE: { emoji: "📈", label: "Variação de preço" },
  BUY: { emoji: "📈", label: "Compra" },
  SELL: { emoji: "📈", label: "Venda" },
  DIVIDEND: { emoji: "💰", label: "Dividendos" },
  JCP: { emoji: "💰", label: "JCP" },
  BONUS: { emoji: "📈", label: "Bonificação" },
  SPLIT: { emoji: "📈", label: "Desdobramento" },
  REVERSE_SPLIT: { emoji: "📈", label: "Grupamento" },
  EARNINGS: { emoji: "📊", label: "Resultados trimestrais" },
  ASSEMBLY: { emoji: "📅", label: "Agenda Financeira" },
  IPO: { emoji: "📅", label: "Agenda Financeira" },
  TREASURY: { emoji: "📅", label: "Agenda Financeira" },
  NEWS: { emoji: "📰", label: "Notícias" },
  INDICATOR_CHANGE: { emoji: "🎯", label: "Radar" },
  ALERT: { emoji: "🔔", label: "Alerta de preço" },
  FINIA: { emoji: "🤖", label: "FinIA" },
  PORTFOLIO: { emoji: "📈", label: "Carteira" },
  RADAR_OPPORTUNITY: { emoji: "🎯", label: "Radar" },
  ACHIEVEMENT: { emoji: "🏆", label: "Conquista" },
}
