-- AlterTable
ALTER TABLE "User" ADD COLUMN     "xp" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "TaskResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeTitle" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "timeTakenSeconds" INTEGER NOT NULL DEFAULT 0,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 0,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskResult_userId_idx" ON "TaskResult"("userId");

-- CreateIndex
CREATE INDEX "TaskResult_completedAt_idx" ON "TaskResult"("completedAt");

-- AddForeignKey
ALTER TABLE "TaskResult" ADD CONSTRAINT "TaskResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
