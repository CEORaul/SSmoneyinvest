import "server-only"

export interface CompanyMatchCandidate {
  id: string
  ticker: string
  name: string
}

export interface CompanyMatcher {
  match(text: string): string[]
}

const LEGAL_SUFFIXES = /\b(s\.?a\.?|s\/a|ltda\.?|on\b|pn\b|units?)\b/gi

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/// Strips legal suffixes (S.A., ON, PN, Units...) from a company name so
/// matching isn't defeated by "Petróleo Brasileiro S.A. - Petrobras" vs. a
/// headline that just says "Petrobras". Returns null for anything left too
/// short to match safely (avoids false positives on 2-3 letter fragments).
function significantName(name: string): string | null {
  const stripped = normalize(name).replace(LEGAL_SUFFIXES, " ").replace(/\s+/g, " ").trim()
  return stripped.length >= 4 ? stripped : null
}

/// Heuristic, best-effort linking between a news article's text and real
/// companies in this app's directory — never a guarantee, never presented
/// as more certain than it is (see NewsArticleCompany's doc comment).
/// Matches a ticker as a whole word (case/accent-insensitive) or a
/// company's "significant" name as a whole-word/phrase match. Patterns are
/// compiled once per call (via buildCompanyMatcher), then reused across
/// every newly-ingested article in a bucket refresh — not recompiled per
/// article, which matters once the company directory reaches thousands of
/// rows.
export function buildCompanyMatcher(candidates: CompanyMatchCandidate[]): CompanyMatcher {
  const compiled = candidates.map((candidate) => ({
    id: candidate.id,
    tickerPattern: new RegExp(`\\b${escapeRegExp(candidate.ticker.toLowerCase())}\\b`),
    significantName: significantName(candidate.name),
  }))

  return {
    match(text: string): string[] {
      const haystack = normalize(text)
      const matches: string[] = []
      for (const candidate of compiled) {
        const tickerHit = candidate.tickerPattern.test(haystack)
        const nameHit = candidate.significantName != null && haystack.includes(candidate.significantName)
        if (tickerHit || nameHit) matches.push(candidate.id)
      }
      return matches
    },
  }
}
