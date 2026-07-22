CREATE TABLE "target_allocations" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "assetClass" "AssetClass" NOT NULL,
    "targetPct" DECIMAL(5,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "target_allocations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "target_allocations_profileId_assetClass_key" ON "target_allocations" ("profileId", "assetClass");

ALTER TABLE "target_allocations" ADD CONSTRAINT "target_allocations_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
