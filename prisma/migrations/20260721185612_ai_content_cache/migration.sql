-- CreateEnum
CREATE TYPE "AiContentKind" AS ENUM ('SUMMARY', 'INDICATOR_EXPLANATION');

-- CreateEnum
CREATE TYPE "AiQuestionType" AS ENUM ('WHAT_IS', 'HOW_INTERPRET', 'IS_HIGH', 'COMPARE_SECTOR', 'HOW_CALCULATE');

-- CreateTable
CREATE TABLE "ai_content" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "kind" "AiContentKind" NOT NULL,
    "assetClass" "AssetClass",
    "indicatorKey" TEXT,
    "questionType" "AiQuestionType",
    "content" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "ai_content_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_content_companyId_kind_idx" ON "ai_content"("companyId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "ai_content_companyId_kind_assetClass_indicatorKey_questionT_key" ON "ai_content"("companyId", "kind", "assetClass", "indicatorKey", "questionType");

-- AddForeignKey
ALTER TABLE "ai_content" ADD CONSTRAINT "ai_content_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
