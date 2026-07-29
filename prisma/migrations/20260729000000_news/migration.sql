-- CreateEnum
CREATE TYPE "NewsProvider" AS ENUM ('GNEWS');

-- CreateEnum
CREATE TYPE "NewsTopic" AS ENUM ('DIVIDENDS', 'EARNINGS', 'ACQUISITIONS', 'MERGERS', 'ECONOMY', 'POLITICS', 'TECHNOLOGY', 'AI', 'CRYPTO');

-- CreateTable
CREATE TABLE "news_articles" (
    "id" TEXT NOT NULL,
    "provider" "NewsProvider" NOT NULL,
    "externalId" TEXT,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT,
    "imageUrl" TEXT,
    "author" TEXT,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "language" TEXT,
    "country" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "buckets" TEXT[],
    "topics" "NewsTopic"[],

    CONSTRAINT "news_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_article_companies" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "news_article_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_news_articles" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_news_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_fetch_logs" (
    "id" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "provider" "NewsProvider" NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "articleCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,

    CONSTRAINT "news_fetch_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "news_articles_url_key" ON "news_articles"("url");

-- CreateIndex
CREATE INDEX "news_articles_publishedAt_idx" ON "news_articles"("publishedAt");

-- CreateIndex (GIN — these columns are queried with array-containment
-- operators (Prisma's hasSome/has), which a default btree index can't serve)
CREATE INDEX "news_articles_buckets_gin_idx" ON "news_articles" USING GIN ("buckets");

-- CreateIndex
CREATE INDEX "news_articles_topics_gin_idx" ON "news_articles" USING GIN ("topics");

-- CreateIndex
CREATE INDEX "news_article_companies_companyId_idx" ON "news_article_companies"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "news_article_companies_articleId_companyId_key" ON "news_article_companies"("articleId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "saved_news_articles_profileId_articleId_key" ON "saved_news_articles"("profileId", "articleId");

-- CreateIndex
CREATE INDEX "news_fetch_logs_bucket_fetchedAt_idx" ON "news_fetch_logs"("bucket", "fetchedAt");

-- AddForeignKey
ALTER TABLE "news_article_companies" ADD CONSTRAINT "news_article_companies_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "news_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_article_companies" ADD CONSTRAINT "news_article_companies_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_news_articles" ADD CONSTRAINT "saved_news_articles_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_news_articles" ADD CONSTRAINT "saved_news_articles_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "news_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
