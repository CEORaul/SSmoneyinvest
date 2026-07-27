-- Score Inteligente da Carteira: one row per day a profile's score was
-- computed. No backfill — starts empty for every existing user and grows
-- one point at a time going forward. See schema.prisma's doc comment on
-- PortfolioScoreSnapshot for why no historical recompute is attempted.
CREATE TABLE "portfolio_score_snapshots" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "breakdown" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portfolio_score_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "portfolio_score_snapshots_profileId_createdAt_idx" ON "portfolio_score_snapshots" ("profileId", "createdAt");

ALTER TABLE "portfolio_score_snapshots" ADD CONSTRAINT "portfolio_score_snapshots_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
