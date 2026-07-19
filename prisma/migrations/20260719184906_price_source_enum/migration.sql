-- CreateEnum
CREATE TYPE "PriceSource" AS ENUM ('AUTO', 'MANUAL', 'OPEN_FINANCE', 'IMPORTED');

-- AlterTable: add the new columns first (priceSource nullable so we can
-- backfill it from isManualEntry before enforcing NOT NULL), then migrate
-- the data, then drop the old boolean. No data loss.
ALTER TABLE "companies" ADD COLUMN     "priceSource" "PriceSource";
ALTER TABLE "companies" ADD COLUMN     "listedOnExchange" BOOLEAN NOT NULL DEFAULT true;

UPDATE "companies"
SET "priceSource" = CASE WHEN "isManualEntry" THEN 'MANUAL' ELSE 'AUTO' END::"PriceSource";

ALTER TABLE "companies" ALTER COLUMN "priceSource" SET NOT NULL;
ALTER TABLE "companies" ALTER COLUMN "priceSource" SET DEFAULT 'AUTO';

ALTER TABLE "companies" DROP COLUMN "isManualEntry";
