-- comparisonKey identifies a multi-company comparison's cache row (the
-- sorted, comma-joined ticker list) — AiContent.companyId is a single
-- nullable FK and can't represent a set of companies. Stays NULL on every
-- pre-existing (single-company) row; Postgres treats NULL as distinct per
-- column in a unique index, so widening the constraint here is non-breaking
-- for all current rows and only starts constraining once comparisonKey is
-- actually set (see ai-content-service.ts, which reads/writes via
-- findFirst + create-or-update rather than upsert-by-key for this exact
-- NULL-handling reason).
ALTER TABLE "ai_content" ADD COLUMN "comparisonKey" TEXT;

DROP INDEX "ai_content_companyId_kind_assetClass_indicatorKey_questionT_key";

CREATE UNIQUE INDEX "ai_content_unique_key" ON "ai_content"
  ("companyId", "kind", "assetClass", "indicatorKey", "questionType", "comparisonKey");
