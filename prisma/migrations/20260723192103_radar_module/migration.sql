-- profileId on ai_content: only set for RADAR_SUMMARY rows (a portfolio-
-- level summary has no company/comparison to key off). NULL on every
-- pre-existing row — Postgres treats NULL as distinct per unique-index
-- column, so this is non-breaking, same rationale as the earlier
-- comparisonKey addition.
ALTER TABLE "ai_content" ADD COLUMN "profileId" TEXT;

DROP INDEX "ai_content_unique_key";

CREATE UNIQUE INDEX "ai_content_unique_key" ON "ai_content"
  ("companyId", "kind", "assetClass", "indicatorKey", "questionType", "comparisonKey", "profileId");

ALTER TABLE "ai_content" ADD CONSTRAINT "ai_content_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Radar module: prepared infrastructure for a future real event/notification
-- pipeline (earnings calendar, news provider, corporate-action feed) — see
-- schema.prisma's doc comments on RadarEvent/RadarNotification. Nothing
-- writes to these tables yet; today's /radar page computes its feed live
-- from Transaction/Company/PortfolioPosition instead.
CREATE TYPE "RadarType" AS ENUM (
  'PRICE_MOVE', 'BUY', 'SELL', 'DIVIDEND', 'JCP', 'BONUS', 'SPLIT',
  'REVERSE_SPLIT', 'EARNINGS', 'ASSEMBLY', 'IPO', 'TREASURY', 'NEWS',
  'INDICATOR_CHANGE', 'ALERT'
);

CREATE TYPE "RadarPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TYPE "RadarStatus" AS ENUM ('PENDING', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "radar_events" (
    "id" TEXT NOT NULL,
    "type" "RadarType" NOT NULL,
    "priority" "RadarPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "RadarStatus" NOT NULL DEFAULT 'PUBLISHED',
    "companyId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "radar_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "radar_events_type_occurredAt_idx" ON "radar_events" ("type", "occurredAt");
CREATE INDEX "radar_events_companyId_occurredAt_idx" ON "radar_events" ("companyId", "occurredAt");

ALTER TABLE "radar_events" ADD CONSTRAINT "radar_events_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "radar_notifications" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "type" "RadarType" NOT NULL,
    "priority" "RadarPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "RadarStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "radar_notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "radar_notifications_profileId_status_createdAt_idx" ON "radar_notifications" ("profileId", "status", "createdAt");

ALTER TABLE "radar_notifications" ADD CONSTRAINT "radar_notifications_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "radar_notifications" ADD CONSTRAINT "radar_notifications_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
