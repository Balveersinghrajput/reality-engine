-- AlterTable
ALTER TABLE "User" ADD COLUMN     "platformRank" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "platformRankTotal" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trackRank" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trackRankTotal" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "GlobalLeaderboard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetTrack" TEXT NOT NULL,
    "trackRank" INTEGER NOT NULL DEFAULT 0,
    "trackRankTotal" INTEGER NOT NULL DEFAULT 0,
    "platformRank" INTEGER NOT NULL DEFAULT 0,
    "platformRankTotal" INTEGER NOT NULL DEFAULT 0,
    "performanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weeklyMovement" INTEGER NOT NULL DEFAULT 0,
    "prevTrackRank" INTEGER NOT NULL DEFAULT 0,
    "prevPlatformRank" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GlobalLeaderboard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GlobalLeaderboard_userId_key" ON "GlobalLeaderboard"("userId");

-- CreateIndex
CREATE INDEX "GlobalLeaderboard_targetTrack_performanceScore_idx" ON "GlobalLeaderboard"("targetTrack", "performanceScore");

-- CreateIndex
CREATE INDEX "GlobalLeaderboard_platformRank_idx" ON "GlobalLeaderboard"("platformRank");

-- CreateIndex
CREATE INDEX "GlobalLeaderboard_trackRank_targetTrack_idx" ON "GlobalLeaderboard"("trackRank", "targetTrack");

-- CreateIndex
CREATE INDEX "User_platformRank_idx" ON "User"("platformRank");

-- CreateIndex
CREATE INDEX "User_trackRank_targetTrack_idx" ON "User"("trackRank", "targetTrack");

-- AddForeignKey
ALTER TABLE "GlobalLeaderboard" ADD CONSTRAINT "GlobalLeaderboard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
