-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TransactionType" ADD VALUE 'JCP';
ALTER TYPE "TransactionType" ADD VALUE 'BONUS';
ALTER TYPE "TransactionType" ADD VALUE 'SPLIT';
ALTER TYPE "TransactionType" ADD VALUE 'REVERSE_SPLIT';

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "feesCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isManualPrice" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "priceSource" TEXT,
ADD COLUMN     "realizedProfitCents" BIGINT;
