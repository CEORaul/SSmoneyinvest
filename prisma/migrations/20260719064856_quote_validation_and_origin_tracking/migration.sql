-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "lastQuoteAt" TIMESTAMP(3),
ADD COLUMN     "lastQuoteAttempts" INTEGER,
ADD COLUMN     "lastQuoteLatencyMs" INTEGER,
ADD COLUMN     "lastQuoteProvider" TEXT,
ADD COLUMN     "lastQuoteStatus" TEXT;

-- CreateTable
CREATE TABLE "quote_validation_alerts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "reasons" TEXT[],
    "rejectedPriceCents" INTEGER,
    "previousPriceCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_validation_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quote_validation_alerts_companyId_createdAt_idx" ON "quote_validation_alerts"("companyId", "createdAt");

-- AddForeignKey
ALTER TABLE "quote_validation_alerts" ADD CONSTRAINT "quote_validation_alerts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
