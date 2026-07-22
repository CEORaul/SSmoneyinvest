-- Enables trigram similarity search (pg_trgm) so the global search can be
-- typo-tolerant ("Petobras" -> PETR4) via similarity()/% instead of only
-- exact/prefix/contains matching. Supabase projects allow this extension.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram GIN indexes so ILIKE '%term%' and similarity() queries against
-- name/ticker stay fast at scale instead of falling back to a seq scan.
CREATE INDEX IF NOT EXISTS "companies_name_trgm_idx" ON "companies" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "companies_ticker_trgm_idx" ON "companies" USING gin ("ticker" gin_trgm_ops);

CREATE TYPE "SearchLogKind" AS ENUM ('SEARCH', 'VIEW');

CREATE TABLE "search_logs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "profileId" TEXT,
    "kind" "SearchLogKind" NOT NULL,
    "query" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "search_logs_companyId_kind_createdAt_idx" ON "search_logs" ("companyId", "kind", "createdAt");
CREATE INDEX "search_logs_profileId_kind_createdAt_idx" ON "search_logs" ("profileId", "kind", "createdAt");

ALTER TABLE "search_logs" ADD CONSTRAINT "search_logs_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "search_logs" ADD CONSTRAINT "search_logs_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
