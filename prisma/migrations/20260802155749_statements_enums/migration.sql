-- Split from the statements_and_splits migration: ALTER TYPE ... ADD VALUE
-- must not share a transaction with other DDL that could reference the new
-- value (established project precedent) — applied first, on its own.

-- CreateEnum
CREATE TYPE "StatementPeriod" AS ENUM ('ANNUAL', 'QUARTERLY');

-- CreateEnum
CREATE TYPE "StockSplitType" AS ENUM ('SPLIT', 'BONUS');

-- AlterEnum
ALTER TYPE "SyncJobType" ADD VALUE 'COMPANY_STATEMENTS';
