-- AlterTable
ALTER TABLE "radar_notifications"
  ADD COLUMN "metadata" JSONB,
  ADD COLUMN "isRead" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "readAt" TIMESTAMP(3),
  ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "pinnedAt" TIMESTAMP(3),
  ADD COLUMN "groupCount" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "sourceKey" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "radar_notifications_profileId_isPinned_priority_createdAt_idx" ON "radar_notifications"("profileId", "isPinned", "priority", "createdAt");

-- CreateIndex
CREATE INDEX "radar_notifications_profileId_isRead_idx" ON "radar_notifications"("profileId", "isRead");

-- CreateIndex
CREATE INDEX "radar_notifications_profileId_sourceKey_idx" ON "radar_notifications"("profileId", "sourceKey");
