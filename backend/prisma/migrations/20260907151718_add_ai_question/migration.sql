-- AlterEnum
ALTER TYPE "UsageEventType" ADD VALUE 'QUESTION_ANSWERED';

-- CreateTable
CREATE TABLE "ai_questions" (
    "id" TEXT NOT NULL,
    "jathakamId" TEXT NOT NULL,
    "language" "Language" NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "confidence" "PredictionConfidence",
    "aiProvider" "AIProviderId",
    "aiModel" TEXT,
    "promptVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_questions_jathakamId_idx" ON "ai_questions"("jathakamId");

-- AddForeignKey
ALTER TABLE "ai_questions" ADD CONSTRAINT "ai_questions_jathakamId_fkey" FOREIGN KEY ("jathakamId") REFERENCES "jathakams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
