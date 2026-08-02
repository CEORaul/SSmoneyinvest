-- BRAPI Pro integration: financial-statement history (Balanço/DRE/Fluxo de
-- Caixa/DVA, annual + quarterly) and real stock split/bonus-share history.
-- Purely additive: new enums, new columns on existing tables, 5 new tables.
-- No existing column/table/index is altered or dropped.
--
-- NOTE: `prisma migrate diff` against the live DB also proposed dropping
-- companies_name_trgm_idx, companies_ticker_trgm_idx,
-- news_articles_buckets_gin_idx, news_articles_topics_gin_idx, and an
-- ALTER on radar_notifications.updatedAt's default — all pre-existing
-- drift unrelated to this change (those indexes/defaults exist in the live
-- DB but aren't tracked in schema.prisma). Deliberately excluded from this
-- migration so this change stays purely additive.

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "employees" INTEGER,
ADD COLUMN     "statementsSyncedAt" TIMESTAMP(3),
ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "dividend_payments" ADD COLUMN     "approvedOn" TIMESTAMP(3),
ADD COLUMN     "isinCode" TEXT,
ADD COLUMN     "relatedTo" TEXT,
ADD COLUMN     "remarks" TEXT;

-- AlterTable
ALTER TABLE "stocks" ADD COLUMN     "freeCashFlowCents" BIGINT,
ADD COLUMN     "operatingCashFlowCents" BIGINT;

-- CreateTable
CREATE TABLE "balance_sheet_statements" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "period" "StatementPeriod" NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalAssetsCents" BIGINT,
    "totalLiabilitiesCents" BIGINT,
    "totalEquityCents" BIGINT,
    "totalCurrentAssetsCents" BIGINT,
    "totalCurrentLiabilitiesCents" BIGINT,
    "cashCents" BIGINT,
    "longTermDebtCents" BIGINT,
    "goodWillCents" BIGINT,
    "intangibleAssetsCents" BIGINT,
    "retainedEarningsCents" BIGINT,
    "raw" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "balance_sheet_statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "income_statements" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "period" "StatementPeriod" NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalRevenueCents" BIGINT,
    "costOfRevenueCents" BIGINT,
    "grossProfitCents" BIGINT,
    "operatingIncomeCents" BIGINT,
    "ebitCents" BIGINT,
    "incomeBeforeTaxCents" BIGINT,
    "incomeTaxExpenseCents" BIGINT,
    "netIncomeCents" BIGINT,
    "basicEps" DECIMAL(12,6),
    "dilutedEps" DECIMAL(12,6),
    "raw" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "income_statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_flow_statements" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "period" "StatementPeriod" NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "operatingCashFlowCents" BIGINT,
    "investmentCashFlowCents" BIGINT,
    "financingCashFlowCents" BIGINT,
    "freeCashFlowCents" BIGINT,
    "initialCashBalanceCents" BIGINT,
    "finalCashBalanceCents" BIGINT,
    "raw" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_flow_statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "value_added_statements" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "period" "StatementPeriod" NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "revenueCents" BIGINT,
    "grossAddedValueCents" BIGINT,
    "netAddedValueCents" BIGINT,
    "addedValueToDistributeCents" BIGINT,
    "teamRemunerationCents" BIGINT,
    "taxesCents" BIGINT,
    "equityRemunerationCents" BIGINT,
    "dividendsCents" BIGINT,
    "retainedEarningsOrLossCents" BIGINT,
    "raw" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "value_added_statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_split_events" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "StockSplitType" NOT NULL,
    "factor" DECIMAL(12,4) NOT NULL,
    "completeFactor" TEXT,
    "isinCode" TEXT,
    "approvedOn" TIMESTAMP(3) NOT NULL,
    "lastDatePrior" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_split_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "balance_sheet_statements_companyId_period_endDate_idx" ON "balance_sheet_statements"("companyId", "period", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "balance_sheet_statements_companyId_endDate_period_key" ON "balance_sheet_statements"("companyId", "endDate", "period");

-- CreateIndex
CREATE INDEX "income_statements_companyId_period_endDate_idx" ON "income_statements"("companyId", "period", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "income_statements_companyId_endDate_period_key" ON "income_statements"("companyId", "endDate", "period");

-- CreateIndex
CREATE INDEX "cash_flow_statements_companyId_period_endDate_idx" ON "cash_flow_statements"("companyId", "period", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "cash_flow_statements_companyId_endDate_period_key" ON "cash_flow_statements"("companyId", "endDate", "period");

-- CreateIndex
CREATE INDEX "value_added_statements_companyId_period_endDate_idx" ON "value_added_statements"("companyId", "period", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "value_added_statements_companyId_endDate_period_key" ON "value_added_statements"("companyId", "endDate", "period");

-- CreateIndex
CREATE INDEX "stock_split_events_companyId_approvedOn_idx" ON "stock_split_events"("companyId", "approvedOn");

-- CreateIndex
CREATE UNIQUE INDEX "stock_split_events_companyId_approvedOn_type_key" ON "stock_split_events"("companyId", "approvedOn", "type");

-- AddForeignKey
ALTER TABLE "balance_sheet_statements" ADD CONSTRAINT "balance_sheet_statements_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_statements" ADD CONSTRAINT "income_statements_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_flow_statements" ADD CONSTRAINT "cash_flow_statements_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "value_added_statements" ADD CONSTRAINT "value_added_statements_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_split_events" ADD CONSTRAINT "stock_split_events_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
