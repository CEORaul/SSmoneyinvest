-- AlterTable: day/52-week range + volume, available for every ticker via
-- BRAPI's basic quote payload — just not mapped yet by BrapiProvider.
ALTER TABLE "companies" ADD COLUMN     "dayHighCents" INTEGER,
ADD COLUMN     "dayLowCents" INTEGER,
ADD COLUMN     "fiftyTwoWeekHighCents" INTEGER,
ADD COLUMN     "fiftyTwoWeekLowCents" INTEGER,
ADD COLUMN     "volume" BIGINT;

-- AlterTable: per-point volume for the price history chart tooltip.
ALTER TABLE "price_history_points" ADD COLUMN     "volume" BIGINT;

-- AlterTable: Stock fundamentals only ever populated by BRAPI's premium
-- defaultKeyStatistics/financialData modules (currently the 4 sandbox
-- tickers only) — nullable, additive, safe to sit unpopulated.
ALTER TABLE "stocks" ADD COLUMN     "beta" DECIMAL(8,4),
ADD COLUMN     "bookValuePerShareCents" INTEGER,
ADD COLUMN     "currentLiquidity" DECIMAL(8,4),
ADD COLUMN     "ebitdaCents" BIGINT,
ADD COLUMN     "ebitdaMargin" DECIMAL(8,4),
ADD COLUMN     "evToEbit" DECIMAL(8,4),
ADD COLUMN     "evToEbitda" DECIMAL(8,4),
ADD COLUMN     "freeFloatPct" DECIMAL(8,4),
ADD COLUMN     "grossDebtCents" BIGINT,
ADD COLUMN     "grossMargin" DECIMAL(8,4),
ADD COLUMN     "netDebtToEbitda" DECIMAL(8,4),
ADD COLUMN     "netIncomeCagr3y" DECIMAL(8,4),
ADD COLUMN     "netIncomeCents" BIGINT,
ADD COLUMN     "payout" DECIMAL(8,4),
ADD COLUMN     "psr" DECIMAL(8,4),
ADD COLUMN     "revenueCagr3y" DECIMAL(8,4),
ADD COLUMN     "revenueCents" BIGINT,
ADD COLUMN     "roa" DECIMAL(8,4),
ADD COLUMN     "sharesOutstanding" BIGINT;
