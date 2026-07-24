CREATE TABLE "saved_market_filters" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "sort" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_market_filters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "saved_market_filters_profileId_name_key" ON "saved_market_filters" ("profileId", "name");

ALTER TABLE "saved_market_filters" ADD CONSTRAINT "saved_market_filters_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
