-- CreateEnum
CREATE TYPE "ThemePreference" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- CreateEnum
CREATE TYPE "LayoutPreference" AS ENUM ('COMFORTABLE', 'COMPACT');

-- CreateEnum
CREATE TYPE "ExperienceMode" AS ENUM ('BEGINNER', 'ADVANCED');

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "theme" "ThemePreference" NOT NULL DEFAULT 'SYSTEM',
    "layout" "LayoutPreference" NOT NULL DEFAULT 'COMFORTABLE',
    "experienceMode" "ExperienceMode" NOT NULL DEFAULT 'BEGINNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_profileId_key" ON "user_preferences"("profileId");

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
