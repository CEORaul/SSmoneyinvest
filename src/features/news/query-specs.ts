import type { NewsSearchParams } from "@/lib/news/providers/types"

export type NewsTabKey =
  | "carteira"
  | "mercado"
  | "alertas"
  | "fiis"
  | "etfs"
  | "cripto"
  | "internacional"

export const NEWS_TAB_LABELS: Record<NewsTabKey, string> = {
  carteira: "Minha Carteira",
  mercado: "Mercado",
  alertas: "Alertas",
  fiis: "FIIs",
  etfs: "ETFs",
  cripto: "Cripto",
  internacional: "Internacional",
}

/// "Minha Carteira" leads — the default/first tab on page load.
export const NEWS_TAB_ORDER: NewsTabKey[] = [
  "carteira",
  "mercado",
  "alertas",
  "fiis",
  "etfs",
  "cripto",
  "internacional",
]

export interface NewsBucketSpec {
  bucket: string
  query: NewsSearchParams
}

/// Tabs backed by one or more cached search-query "buckets" — each bucket
/// is one GNews /search call, cached and refreshed independently (see
/// news-cache-service.ts). "Minha Carteira"/"Alertas" are deliberately
/// absent here: they're computed by filtering the whole
/// already-cached article set against the profile's real companies (see
/// queries.ts), never their own provider query — there's no bucket to
/// refresh because there's nothing new to fetch, just a different lens on
/// data every other tab already pulled in.
///
/// Query tuning (the exact keywords/lang per bucket) is intentionally
/// isolated here, separate from the fetch/cache mechanics, so adjusting
/// coverage later never touches news-cache-service.ts or NewsService.
export const NEWS_BUCKET_SPECS: Partial<Record<NewsTabKey, NewsBucketSpec[]>> = {
  mercado: [
    { bucket: "mercado-economia", query: { query: "economia Brasil OR PIB OR juros", lang: "pt" } },
    { bucket: "mercado-ibovespa", query: { query: 'Ibovespa OR "bolsa de valores"', lang: "pt" } },
    { bucket: "mercado-selic", query: { query: "Selic OR Copom", lang: "pt" } },
    { bucket: "mercado-inflacao", query: { query: "inflação OR IPCA Brasil", lang: "pt" } },
    { bucket: "mercado-empresas", query: { query: "resultado trimestral OR balanço empresa", lang: "pt" } },
    { bucket: "mercado-dividendos", query: { query: "dividendos ações Brasil", lang: "pt" } },
  ],
  fiis: [{ bucket: "fiis", query: { query: "fundo imobiliário OR FII", lang: "pt" } }],
  etfs: [{ bucket: "etfs", query: { query: 'ETF investimento OR "fundo de índice"', lang: "pt" } }],
  cripto: [
    { bucket: "cripto-btc", query: { query: "Bitcoin" } },
    { bucket: "cripto-eth", query: { query: "Ethereum" } },
    { bucket: "cripto-altcoin", query: { query: "altcoin OR criptomoeda" } },
    { bucket: "cripto-regulacao", query: { query: "regulação criptomoeda OR CVM cripto", lang: "pt" } },
    { bucket: "cripto-etf", query: { query: '"Bitcoin ETF" OR "spot ETF"' } },
  ],
  internacional: [
    { bucket: "intl-us", query: { query: 'Wall Street OR "US stock market"', lang: "en" } },
    { bucket: "intl-europe", query: { query: "European markets OR ECB", lang: "en" } },
    { bucket: "intl-asia", query: { query: "Asian markets OR China economy", lang: "en" } },
    { bucket: "intl-tech", query: { query: "technology industry", lang: "en" } },
    { bucket: "intl-ai", query: { query: "artificial intelligence industry", lang: "en" } },
  ],
}

export function getBucketSpecsForTab(tab: NewsTabKey): NewsBucketSpec[] {
  return NEWS_BUCKET_SPECS[tab] ?? []
}

export function getBucketKeysForTab(tab: NewsTabKey): string[] {
  return getBucketSpecsForTab(tab).map((spec) => spec.bucket)
}

export const ALL_BUCKET_SPECS: NewsBucketSpec[] = Object.values(NEWS_BUCKET_SPECS).flat()
