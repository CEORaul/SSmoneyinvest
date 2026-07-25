-- Central de Alertas Inteligentes: user-configured price alerts on any
-- Company, checked against already-synced priceCents (never the provider
-- directly — see checkPriceAlertsForCompany), plus the notification-bell
-- history of firings. See schema.prisma's doc comments on AlertType/
-- PriceAlert/AlertNotification for the "why" behind each design choice.
CREATE TYPE "AlertType" AS ENUM ('PRICE');

CREATE TYPE "AlertDirection" AS ENUM ('ABOVE', 'BELOW');

CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'TRIGGERED', 'PAUSED', 'CANCELED');

CREATE TYPE "AlertNotificationStatus" AS ENUM ('UNREAD', 'READ');

CREATE TABLE "price_alerts" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "AlertType" NOT NULL DEFAULT 'PRICE',
    "direction" "AlertDirection" NOT NULL,
    "targetPriceCents" INTEGER NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "triggeredAt" TIMESTAMP(3),
    "triggeredPriceCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_alerts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "price_alerts_profileId_status_createdAt_idx" ON "price_alerts" ("profileId", "status", "createdAt");
CREATE INDEX "price_alerts_companyId_status_direction_idx" ON "price_alerts" ("companyId", "status", "direction");

ALTER TABLE "price_alerts" ADD CONSTRAINT "price_alerts_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "price_alerts" ADD CONSTRAINT "price_alerts_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "alert_notifications" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "direction" "AlertDirection" NOT NULL,
    "targetPriceCents" INTEGER NOT NULL,
    "triggeredPriceCents" INTEGER NOT NULL,
    "status" "AlertNotificationStatus" NOT NULL DEFAULT 'UNREAD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "alert_notifications_profileId_status_createdAt_idx" ON "alert_notifications" ("profileId", "status", "createdAt");

ALTER TABLE "alert_notifications" ADD CONSTRAINT "alert_notifications_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "alert_notifications" ADD CONSTRAINT "alert_notifications_alertId_fkey"
  FOREIGN KEY ("alertId") REFERENCES "price_alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "alert_notifications" ADD CONSTRAINT "alert_notifications_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
