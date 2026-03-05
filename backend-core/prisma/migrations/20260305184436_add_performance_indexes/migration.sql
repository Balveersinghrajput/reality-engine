-- Add composite index on Connection(senderId, status) to speed up
-- getConnections queries that filter on both columns via OR clause.
CREATE INDEX "Connection_senderId_status_idx" ON "Connection"("senderId", "status");

-- Add composite index on TaskResult(userId, completedAt) to accelerate
-- the leaderboard active-days query that filters on both columns.
CREATE INDEX "TaskResult_userId_completedAt_idx" ON "TaskResult"("userId", "completedAt");

-- Add composite index on TaskResult(userId, challengeTitle) to accelerate
-- test-history and leaderboard queries that filter on both columns.
CREATE INDEX "TaskResult_userId_challengeTitle_idx" ON "TaskResult"("userId", "challengeTitle");
