-- CreateEnum
CREATE TYPE "AssetClass" AS ENUM ('STOCK', 'FII', 'ETF');

-- CreateEnum
CREATE TYPE "DividendType" AS ENUM ('DIVIDEND', 'JCP', 'RENDIMENTO');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('BUY', 'SELL', 'DIVIDEND');

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT,
    "avatarUrl" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "locale" TEXT NOT NULL DEFAULT 'pt-BR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "description" TEXT,
    "sector" TEXT,
    "segment" TEXT,
    "assetClass" "AssetClass" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "priceChangePct" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "marketCapCents" BIGINT,
    "listedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stocks" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "priceToEarnings" DECIMAL(10,2),
    "priceToBook" DECIMAL(10,2),
    "roe" DECIMAL(8,4),
    "roic" DECIMAL(8,4),
    "dividendYield" DECIMAL(8,4),
    "netMargin" DECIMAL(8,4),
    "netDebtCents" BIGINT,
    "equityCents" BIGINT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiis" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "priceToBook" DECIMAL(10,2),
    "dividendYield" DECIMAL(8,4),
    "netWorthCents" BIGINT,
    "managementFee" DECIMAL(8,4),
    "vacancyRate" DECIMAL(8,4),
    "propertyCount" INTEGER,
    "quotaCount" BIGINT,
    "administrator" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fiis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etfs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "benchmarkIndex" TEXT,
    "expenseRatio" DECIMAL(8,4),
    "navCents" BIGINT,
    "dividendYield" DECIMAL(8,4),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "etfs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_history_points" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "closeCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_history_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dividend_payments" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "DividendType" NOT NULL DEFAULT 'DIVIDEND',
    "amountPerShare" DECIMAL(12,6) NOT NULL,
    "exDate" TIMESTAMP(3) NOT NULL,
    "paymentDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dividend_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_positions" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "quantity" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "averagePriceCents" INTEGER NOT NULL DEFAULT 0,
    "totalInvestedCents" BIGINT NOT NULL DEFAULT 0,
    "totalDividendsCents" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolio_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "quantity" DECIMAL(18,8) NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "totalCents" BIGINT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "companies_ticker_key" ON "companies"("ticker");

-- CreateIndex
CREATE INDEX "companies_assetClass_idx" ON "companies"("assetClass");

-- CreateIndex
CREATE INDEX "companies_sector_idx" ON "companies"("sector");

-- CreateIndex
CREATE UNIQUE INDEX "stocks_companyId_key" ON "stocks"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "fiis_companyId_key" ON "fiis"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "etfs_companyId_key" ON "etfs"("companyId");

-- CreateIndex
CREATE INDEX "price_history_points_companyId_date_idx" ON "price_history_points"("companyId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "price_history_points_companyId_date_key" ON "price_history_points"("companyId", "date");

-- CreateIndex
CREATE INDEX "dividend_payments_companyId_exDate_idx" ON "dividend_payments"("companyId", "exDate");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_profileId_companyId_key" ON "favorites"("profileId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_positions_profileId_companyId_key" ON "portfolio_positions"("profileId", "companyId");

-- CreateIndex
CREATE INDEX "transactions_profileId_date_idx" ON "transactions"("profileId", "date");

-- CreateIndex
CREATE INDEX "transactions_profileId_companyId_idx" ON "transactions"("profileId", "companyId");

-- AddForeignKey
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiis" ADD CONSTRAINT "fiis_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etfs" ADD CONSTRAINT "etfs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history_points" ADD CONSTRAINT "price_history_points_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dividend_payments" ADD CONSTRAINT "dividend_payments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_positions" ADD CONSTRAINT "portfolio_positions_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_positions" ADD CONSTRAINT "portfolio_positions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
