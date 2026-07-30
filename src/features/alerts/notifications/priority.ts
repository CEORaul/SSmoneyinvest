import type { RadarPriority, RadarType } from "@/generated/prisma/client"

/// Default priority per RadarType, straight from the spec's own
/// Alta/Média/Baixa buckets:
/// - Alta: alerta de preço atingido, resultado divulgado, dividendos
///   anunciados, evento acontecendo hoje.
/// - Média: notícia importante, radar encontrou oportunidade, ativo entrou
///   em filtro, eventos de carteira (compra/venda/bonificação/...).
/// - Baixa: resumo diário/semanal, novidades da plataforma, dicas da FinIA.
const DEFAULT_PRIORITY: Record<RadarType, RadarPriority> = {
  ALERT: "HIGH",
  DIVIDEND: "HIGH",
  JCP: "HIGH",
  EARNINGS: "HIGH",
  ASSEMBLY: "MEDIUM",
  IPO: "MEDIUM",
  TREASURY: "MEDIUM",
  NEWS: "MEDIUM",
  RADAR_OPPORTUNITY: "MEDIUM",
  INDICATOR_CHANGE: "MEDIUM",
  PRICE_MOVE: "MEDIUM",
  BUY: "MEDIUM",
  SELL: "MEDIUM",
  BONUS: "MEDIUM",
  SPLIT: "MEDIUM",
  REVERSE_SPLIT: "MEDIUM",
  PORTFOLIO: "LOW",
  FINIA: "LOW",
  ACHIEVEMENT: "LOW",
}

export interface ComputeNotificationPriorityOptions {
  /// An event happening TODAY (e.g. a real earnings-calendar date matching
  /// today) is always Alta regardless of its type's default — see spec's
  /// "evento acontecendo hoje". No producer sets this yet (no calendar
  /// exists), but the option exists so one can flip it on without touching
  /// this function's signature.
  isToday?: boolean
  /// A FinIA/Carteira insight that represents a real milestone (novo
  /// recorde de patrimônio, alta/queda expressiva do dia) reads as more
  /// than a routine "dica" — bump it to Média instead of the type's Baixa
  /// default.
  isMilestone?: boolean
}

/// Pure function — every producer (AlertService, recordIncomeAction, news
/// hydration, digest.ts) calls this to get a notification's priority rather
/// than hardcoding one inline, so the Alta/Média/Baixa rules live in exactly
/// one place.
export function computeNotificationPriority(
  type: RadarType,
  opts?: ComputeNotificationPriorityOptions
): RadarPriority {
  if (opts?.isToday) return "HIGH"
  if (opts?.isMilestone && DEFAULT_PRIORITY[type] === "LOW") return "MEDIUM"
  return DEFAULT_PRIORITY[type]
}
