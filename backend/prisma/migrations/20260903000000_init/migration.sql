-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ASTROLOGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'BASIC', 'PREMIUM', 'PROFESSIONAL', 'ASTROLOGER');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "BirthTimeAccuracy" AS ENUM ('EXACT', 'WITHIN_5_MIN', 'WITHIN_15_MIN', 'WITHIN_30_MIN', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('TA', 'EN', 'SI', 'ML', 'HI', 'TE', 'KN', 'MS');

-- CreateEnum
CREATE TYPE "Ayanamsa" AS ENUM ('LAHIRI');

-- CreateEnum
CREATE TYPE "Graha" AS ENUM ('SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN', 'RAHU', 'KETU', 'LAGNA');

-- CreateEnum
CREATE TYPE "Dignity" AS ENUM ('EXALTED', 'DEBILITATED', 'OWN_SIGN', 'FRIENDLY', 'ENEMY', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "DivisionalChartType" AS ENUM ('D1', 'D2', 'D3', 'D4', 'D7', 'D9', 'D10', 'D12', 'D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'D60');

-- CreateEnum
CREATE TYPE "DashaLevel" AS ENUM ('MAHA', 'ANTAR', 'PRATYANTAR');

-- CreateEnum
CREATE TYPE "YogaStrength" AS ENUM ('LOW', 'MODERATE', 'STRONG');

-- CreateEnum
CREATE TYPE "DoshaSeverity" AS ENUM ('LOW', 'MODERATE', 'STRONG');

-- CreateEnum
CREATE TYPE "AIProviderId" AS ENUM ('ANTHROPIC', 'OPENAI', 'GEMINI', 'NVIDIA_NIM', 'OLLAMA');

-- CreateEnum
CREATE TYPE "PredictionConfidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "birth_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "dateOfBirth" DATE NOT NULL,
    "timeOfBirth" TEXT NOT NULL,
    "timeAccuracy" "BirthTimeAccuracy" NOT NULL DEFAULT 'EXACT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "birth_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "birth_locations" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "placeName" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "timezone" TEXT NOT NULL,
    "utcOffsetMinutes" INTEGER NOT NULL,
    "dstApplicable" BOOLEAN NOT NULL DEFAULT false,
    "manuallyCorrected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "birth_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "language_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "language" "Language" NOT NULL DEFAULT 'TA',

    CONSTRAINT "language_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculation_settings" (
    "id" TEXT NOT NULL,
    "ayanamsa" "Ayanamsa" NOT NULL DEFAULT 'LAHIRI',
    "engineVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calculation_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jathakams" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "calculationSettingId" TEXT NOT NULL,
    "julianDay" DOUBLE PRECISION NOT NULL,
    "chartData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jathakams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planets" (
    "id" TEXT NOT NULL,
    "jathakamId" TEXT NOT NULL,
    "graha" "Graha" NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "signIndex" INTEGER NOT NULL,
    "degreeInSign" DOUBLE PRECISION NOT NULL,
    "nakshatra" INTEGER NOT NULL,
    "pada" INTEGER NOT NULL,
    "house" INTEGER NOT NULL,
    "retrograde" BOOLEAN NOT NULL DEFAULT false,
    "combust" BOOLEAN NOT NULL DEFAULT false,
    "dignity" "Dignity",
    "strengthScore" DOUBLE PRECISION,

    CONSTRAINT "planets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "houses" (
    "id" TEXT NOT NULL,
    "jathakamId" TEXT NOT NULL,
    "houseNo" INTEGER NOT NULL,
    "signIndex" INTEGER NOT NULL,
    "lord" "Graha" NOT NULL,
    "lordHouse" INTEGER NOT NULL,
    "occupants" "Graha"[],

    CONSTRAINT "houses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "divisional_charts" (
    "id" TEXT NOT NULL,
    "jathakamId" TEXT NOT NULL,
    "chartType" "DivisionalChartType" NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "divisional_charts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashas" (
    "id" TEXT NOT NULL,
    "jathakamId" TEXT NOT NULL,
    "level" "DashaLevel" NOT NULL,
    "graha" "Graha" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "dashas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transits" (
    "id" TEXT NOT NULL,
    "jathakamId" TEXT NOT NULL,
    "asOfDate" TIMESTAMP(3) NOT NULL,
    "graha" "Graha" NOT NULL,
    "signIndex" INTEGER NOT NULL,
    "house" INTEGER NOT NULL,
    "effectTags" TEXT[],

    CONSTRAINT "transits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "yogas" (
    "id" TEXT NOT NULL,
    "jathakamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "strength" "YogaStrength" NOT NULL,
    "participatingPlanets" "Graha"[],
    "participatingHouses" INTEGER[],
    "interpretationKey" TEXT NOT NULL,

    CONSTRAINT "yogas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doshas" (
    "id" TEXT NOT NULL,
    "jathakamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "severity" "DoshaSeverity" NOT NULL,
    "ruleTriggered" TEXT NOT NULL,

    CONSTRAINT "doshas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "predictions" (
    "id" TEXT NOT NULL,
    "jathakamId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "language" "Language" NOT NULL,
    "text" TEXT NOT NULL,
    "confidence" "PredictionConfidence",
    "aiProvider" "AIProviderId",
    "aiModel" TEXT,
    "promptVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "jathakamId" TEXT NOT NULL,
    "language" "Language" NOT NULL,
    "pdfPath" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remedies" (
    "id" TEXT NOT NULL,
    "jathakamId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "remedies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "birth_profiles_userId_idx" ON "birth_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "birth_locations_profileId_key" ON "birth_locations"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "language_settings_userId_key" ON "language_settings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "calculation_settings_ayanamsa_engineVersion_key" ON "calculation_settings"("ayanamsa", "engineVersion");

-- CreateIndex
CREATE INDEX "jathakams_profileId_idx" ON "jathakams"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "planets_jathakamId_graha_key" ON "planets"("jathakamId", "graha");

-- CreateIndex
CREATE UNIQUE INDEX "houses_jathakamId_houseNo_key" ON "houses"("jathakamId", "houseNo");

-- CreateIndex
CREATE UNIQUE INDEX "divisional_charts_jathakamId_chartType_key" ON "divisional_charts"("jathakamId", "chartType");

-- CreateIndex
CREATE INDEX "dashas_jathakamId_level_idx" ON "dashas"("jathakamId", "level");

-- CreateIndex
CREATE INDEX "dashas_jathakamId_startDate_endDate_idx" ON "dashas"("jathakamId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "transits_jathakamId_asOfDate_idx" ON "transits"("jathakamId", "asOfDate");

-- CreateIndex
CREATE UNIQUE INDEX "predictions_jathakamId_section_language_key" ON "predictions"("jathakamId", "section", "language");

-- AddForeignKey
ALTER TABLE "birth_profiles" ADD CONSTRAINT "birth_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "birth_locations" ADD CONSTRAINT "birth_locations_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "birth_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "language_settings" ADD CONSTRAINT "language_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jathakams" ADD CONSTRAINT "jathakams_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "birth_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jathakams" ADD CONSTRAINT "jathakams_calculationSettingId_fkey" FOREIGN KEY ("calculationSettingId") REFERENCES "calculation_settings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planets" ADD CONSTRAINT "planets_jathakamId_fkey" FOREIGN KEY ("jathakamId") REFERENCES "jathakams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "houses" ADD CONSTRAINT "houses_jathakamId_fkey" FOREIGN KEY ("jathakamId") REFERENCES "jathakams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "divisional_charts" ADD CONSTRAINT "divisional_charts_jathakamId_fkey" FOREIGN KEY ("jathakamId") REFERENCES "jathakams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashas" ADD CONSTRAINT "dashas_jathakamId_fkey" FOREIGN KEY ("jathakamId") REFERENCES "jathakams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashas" ADD CONSTRAINT "dashas_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "dashas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transits" ADD CONSTRAINT "transits_jathakamId_fkey" FOREIGN KEY ("jathakamId") REFERENCES "jathakams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yogas" ADD CONSTRAINT "yogas_jathakamId_fkey" FOREIGN KEY ("jathakamId") REFERENCES "jathakams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doshas" ADD CONSTRAINT "doshas_jathakamId_fkey" FOREIGN KEY ("jathakamId") REFERENCES "jathakams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_jathakamId_fkey" FOREIGN KEY ("jathakamId") REFERENCES "jathakams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_jathakamId_fkey" FOREIGN KEY ("jathakamId") REFERENCES "jathakams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remedies" ADD CONSTRAINT "remedies_jathakamId_fkey" FOREIGN KEY ("jathakamId") REFERENCES "jathakams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

