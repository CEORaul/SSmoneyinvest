import "server-only"

import type { NewsProvider as NewsProviderEnum } from "@/generated/prisma/client"
import { buildCompanyMatcher } from "@/features/news/company-matcher"
import type { NewsBucketSpec } from "@/features/news/query-specs"
import { tagTopics } from "@/features/news/topic-tagger"
import { NewsService } from "@/lib/news/news-service"
import type { NewsProviderArticle } from "@/lib/news/providers/types"
import { prisma } from "@/lib/prisma"

/// How long a bucket's cached articles are trusted before the next request
/// for that bucket triggers a real provider call — the primary lever for
/// staying within a shared GNews API key's daily quota across every user of
/// this app. Short enough that tab content doesn't feel stale,
/// long enough that a burst of page loads across many users never causes a
/// burst of provider calls.
const NEWS_CACHE_TTL_MINUTES = 30

// Only "gnews" exists today — this map is the one place that grows when a
// second provider (Finnhub, NewsAPI...) is registered.
const PROVIDER_ENUM_BY_NAME: Record<string, NewsProviderEnum> = {
  gnews: "GNEWS",
}

function toProviderEnum(name: string): NewsProviderEnum {
  return PROVIDER_ENUM_BY_NAME[name] ?? "GNEWS"
}

async function persistArticles(articles: NewsProviderArticle[], bucket: string): Promise<void> {
  if (articles.length === 0) return

  const provider = toProviderEnum(NewsService.activeProviderName)
  const companies = await prisma.company.findMany({ select: { id: true, ticker: true, name: true } })
  const matcher = buildCompanyMatcher(companies)

  for (const article of articles) {
    const existing = await prisma.newsArticle.findUnique({
      where: { url: article.url },
      select: { id: true, buckets: true },
    })

    if (existing) {
      if (existing.buckets.includes(bucket)) continue
      await prisma.newsArticle.update({
        where: { id: existing.id },
        data: { buckets: [...existing.buckets, bucket] },
      })
      continue
    }

    const text = `${article.title} ${article.description ?? ""}`
    const topics = tagTopics(text)
    const companyIds = matcher.match(text)

    await prisma.newsArticle.create({
      data: {
        provider,
        externalId: article.externalId,
        url: article.url,
        title: article.title,
        description: article.description,
        content: article.content,
        imageUrl: article.imageUrl,
        author: article.author,
        sourceName: article.sourceName,
        sourceUrl: article.sourceUrl,
        language: article.language,
        country: article.country,
        publishedAt: article.publishedAt,
        buckets: [bucket],
        topics,
        companyLinks: companyIds.length > 0 ? { create: companyIds.map((companyId) => ({ companyId })) } : undefined,
      },
    })
  }
}

/// Refreshes one bucket if its cache is stale, logging the attempt either
/// way. Never throws — a provider failure (missing key, rate limit, network
/// error) is recorded in NewsFetchLog and the caller's subsequent DB read
/// just serves whatever was already cached (possibly nothing, rendered as
/// an honest empty state), never fabricated articles.
export async function ensureBucketFresh(spec: NewsBucketSpec): Promise<void> {
  const lastSuccess = await prisma.newsFetchLog.findFirst({
    where: { bucket: spec.bucket, status: "OK" },
    orderBy: { fetchedAt: "desc" },
    select: { fetchedAt: true },
  })

  const isFresh = lastSuccess != null && Date.now() - lastSuccess.fetchedAt.getTime() < NEWS_CACHE_TTL_MINUTES * 60 * 1000
  if (isFresh) return

  const provider = toProviderEnum(NewsService.activeProviderName)

  try {
    const articles = await NewsService.search(spec.query)
    await persistArticles(articles, spec.bucket)
    await prisma.newsFetchLog.create({
      data: { bucket: spec.bucket, provider, articleCount: articles.length, status: "OK" },
    })
  } catch (error) {
    await prisma.newsFetchLog.create({
      data: {
        bucket: spec.bucket,
        provider,
        articleCount: 0,
        status: "ERROR",
        errorMessage: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
      },
    })
  }
}

export async function ensureBucketsFresh(specs: NewsBucketSpec[]): Promise<void> {
  await Promise.all(specs.map((spec) => ensureBucketFresh(spec)))
}

/// Caps how many per-company GNews searches a single Minha Carteira/Monitor
/// de Ativos request can trigger — without this, a large portfolio would
/// mean one provider call per holding on every cache-miss, which a shared
/// free-tier API key can't sustain across many users. Companies beyond the
/// cap still surface normally if they happen to appear in the generic
/// category buckets (Mercado/FIIs/.../Internacional) — they just don't get
/// their own dedicated search.
const MAX_COMPANY_BUCKETS = 15

function toCompanyBucketSpec(company: { ticker: string; name: string }): NewsBucketSpec {
  return { bucket: `company-${company.ticker}`, query: { query: `"${company.ticker}" OR "${company.name}"`, lang: "pt" } }
}

/// Minha Carteira/Monitor de Ativos were originally a pure filter over
/// whatever the generic category tabs happened to cache — which turned out
/// to almost never mention a specific held ticker in practice (a handful of
/// broad "economia"/"Ibovespa" searches rarely name any one company). This
/// gives those two tabs their own targeted searches per company, subject to
/// the same 30-minute cache TTL as every other bucket.
///
/// Sequential, not Promise.all like ensureBucketsFresh — a portfolio with
/// several holdings firing that many GNews calls at once trips its rate
/// limit (verified live: a 5-company burst 429'd one of the five even with
/// fetchWithRetry's backoff). One at a time costs a bit of latency on a
/// cold cache but each company's own 30-minute TTL means this almost never
/// runs at full length twice in a row for the same user.
export async function ensureCompanyBucketsFresh(companies: { ticker: string; name: string }[]): Promise<void> {
  for (const spec of companies.slice(0, MAX_COMPANY_BUCKETS).map(toCompanyBucketSpec)) {
    await ensureBucketFresh(spec)
  }
}
