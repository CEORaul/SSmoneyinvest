-- CreateEnum
CREATE TYPE "ProviderStatus" AS ENUM ('ONLINE', 'DEGRADED', 'OFFLINE');

-- CreateTable
CREATE TABLE "provider_health" (
    "id" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "status" "ProviderStatus" NOT NULL DEFAULT 'ONLINE',
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "totalRequests" INTEGER NOT NULL DEFAULT 0,
    "totalFailures" INTEGER NOT NULL DEFAULT 0,
    "lastLatencyMs" INTEGER,
    "avgLatencyMs" INTEGER,
    "lastError" TEXT,
    "lastSuccessAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_health_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "provider_health_providerName_key" ON "provider_health"("providerName");
