-- CreateEnum
CREATE TYPE "UsageEventType" AS ENUM ('JATHAKAM_CREATED', 'PREDICTION_GENERATED', 'PDF_GENERATED', 'ERROR');

-- CreateTable
CREATE TABLE "usage_logs" (
    "id" TEXT NOT NULL,
    "eventType" "UsageEventType" NOT NULL,
    "userId" TEXT,
    "jathakamId" TEXT,
    "aiProvider" "AIProviderId",
    "aiModel" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_key_configs" (
    "id" TEXT NOT NULL,
    "provider" "AIProviderId" NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_key_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "usage_logs_eventType_createdAt_idx" ON "usage_logs"("eventType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "api_key_configs_provider_key" ON "api_key_configs"("provider");
