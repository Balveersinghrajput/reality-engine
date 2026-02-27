const { prisma } = require('../../core/database/prismaClient');
const { getCache, setCache } = require('../../core/cache/cacheManager');

// ── Get Batch Leaderboard ─────────────────────
async function getBatchLeaderboard(batchId, currentUserId) {
  const cacheKey = `leaderboard:batch:${batchId}`;
  const cached = await getCache(cacheKey);

  let members;

  if (cached) {
    // ✅ Use cached data but NEVER trust cached isCurrentUser
    // Re-apply isCurrentUser based on the actual requesting user
    members = cached.map(m => ({
      ...m,
      isCurrentUser: m.userId === currentUserId,
    }));
  } else {
    const rawMembers = await prisma.batchMember.findMany({
      where: { batchId },
      orderBy: { performanceScore: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profilePic: true,
            tier: true,
            streakCurrent: true,
            masteryPercent: true,
            trackRank: true,
            platformRank: true,
            level: true,
          },
        },
      },
    });

    // Get previous week history for movement
    const now = new Date();
    const weekNumber = Math.ceil(now.getDate() / 7);
    const prevHistory = await prisma.leaderboardHistory.findMany({
      where: {
        batchId,
        weekNumber: weekNumber - 1,
        year: now.getFullYear(),
      },
    });

    const prevRankMap = {};
    prevHistory.forEach(h => { prevRankMap[h.userId] = h.rank; });

    // ✅ Build members WITHOUT isCurrentUser before caching
    const membersToCache = rawMembers.map((m, idx) => {
      const currentRank = idx + 1;
      const prevRank = prevRankMap[m.userId] || currentRank;
      const movement = prevRank - currentRank;
      return {
        rank: currentRank,
        movement,
        userId: m.userId,
        username: m.user.username,
        profilePic: m.user.profilePic,
        tier: m.user.tier,
        level: m.user.level,
        streakCurrent: m.user.streakCurrent,
        masteryPercent: m.user.masteryPercent,
        performanceScore: m.performanceScore,
        trackRank: m.user.trackRank,
        platformRank: m.user.platformRank,
        // ✅ DO NOT include isCurrentUser here — it would poison the cache
      };
    });

    await setCache(cacheKey, membersToCache, 60);

    // Apply isCurrentUser only for the response
    members = membersToCache.map(m => ({
      ...m,
      isCurrentUser: m.userId === currentUserId,
    }));
  }

  // Find current user entry
  const currentUserEntry = members.find(m => m.userId === currentUserId);
  const batchTotal = members.length;

  // Batch average
  const batchAvg = members.length > 0
    ? Math.round(members.reduce((s, m) => s + m.performanceScore, 0) / members.length)
    : 0;

  const currentRank = currentUserEntry?.rank ?? 0;

  // Next competitor to beat (only relevant if not rank #1)
  const nextCompetitor = currentRank > 1
    ? members.find(m => m.rank === currentRank - 1)
    : null;

  const gap = nextCompetitor
    ? (nextCompetitor.performanceScore - (currentUserEntry?.performanceScore || 0)).toFixed(1)
    : 0;

  const aboveBatch = currentUserEntry
    ? (currentUserEntry.performanceScore - batchAvg).toFixed(1)
    : 0;

  return {
    leaderboard: members,
    insights: {
      yourRank: currentRank,
      batchTotal,
      batchAvg,
      aboveBatchAvg: aboveBatch,
      nextCompetitor: nextCompetitor?.username || null,
      gapToNext: gap,
      message: currentRank === 1
        ? '🏆 You are #1 in your batch! Keep it up!'
        : currentRank === 0
          ? 'Complete tasks to appear on the leaderboard!'
          : `You need +${gap}% to beat ${nextCompetitor?.username}`,
    },
  };
}

// ── Get Track Global Leaderboard ──────────────
async function getTrackLeaderboard(targetTrack, currentUserId) {
  const cacheKey = `leaderboard:track:${targetTrack}`;
  const cached = await getCache(cacheKey);

  let leaderboard;

  if (cached) {
    // ✅ Re-apply isCurrentUser after cache retrieval
    leaderboard = cached.map(u => ({
      ...u,
      isCurrentUser: u.userId === currentUserId,
    }));
  } else {
    const users = await prisma.globalLeaderboard.findMany({
      where: { targetTrack },
      orderBy: { trackRank: 'asc' },
      take: 100,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profilePic: true,
            tier: true,
            level: true,
            streakCurrent: true,
            masteryPercent: true,
          },
        },
      },
    });

    // ✅ Cache WITHOUT isCurrentUser
    const toCache = users.map(u => ({
      userId: u.userId,
      trackRank: u.trackRank,
      trackRankTotal: u.trackRankTotal,
      platformRank: u.platformRank,
      performanceScore: u.performanceScore,
      weeklyMovement: u.weeklyMovement,
      username: u.user.username,
      profilePic: u.user.profilePic,
      tier: u.user.tier,
      level: u.user.level,
      streakCurrent: u.user.streakCurrent,
      masteryPercent: u.user.masteryPercent,
    }));

    await setCache(cacheKey, toCache, 300);

    leaderboard = toCache.map(u => ({
      ...u,
      isCurrentUser: u.userId === currentUserId,
    }));
  }

  const current = leaderboard.find(u => u.userId === currentUserId);
  return { leaderboard, currentUser: current };
}

// ── Get Platform Leaderboard ──────────────────
async function getPlatformLeaderboard(currentUserId) {
  const cacheKey = 'leaderboard:platform:top100';
  const cached = await getCache(cacheKey);

  let leaderboard;

  if (cached) {
    // ✅ Re-apply isCurrentUser after cache retrieval
    leaderboard = cached.map(u => ({
      ...u,
      isCurrentUser: u.userId === currentUserId,
    }));
  } else {
    const users = await prisma.globalLeaderboard.findMany({
      orderBy: { platformRank: 'asc' },
      take: 100,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profilePic: true,
            tier: true,
            targetTrack: true,
            level: true,
            streakCurrent: true,
            masteryPercent: true,
          },
        },
      },
    });

    // ✅ Cache WITHOUT isCurrentUser
    const toCache = users.map(u => ({
      userId: u.userId,
      platformRank: u.platformRank,
      platformRankTotal: u.platformRankTotal,
      trackRank: u.trackRank,
      targetTrack: u.user.targetTrack,
      performanceScore: u.performanceScore,
      weeklyMovement: u.weeklyMovement,
      username: u.user.username,
      profilePic: u.user.profilePic,
      tier: u.user.tier,
      level: u.user.level,
      streakCurrent: u.user.streakCurrent,
      masteryPercent: u.user.masteryPercent,
    }));

    await setCache(cacheKey, toCache, 300);

    leaderboard = toCache.map(u => ({
      ...u,
      isCurrentUser: u.userId === currentUserId,
    }));
  }

  const current = leaderboard.find(u => u.userId === currentUserId);
  return { leaderboard, currentUser: current };
}

// ── Get User Rank ─────────────────────────────
async function getUserRank(userId) {
  const [batchMember, global] = await Promise.all([
    prisma.batchMember.findUnique({
      where: { userId },
      include: {
        batch: {
          include: { _count: { select: { members: true } } },
        },
      },
    }),
    prisma.globalLeaderboard.findUnique({
      where: { userId },
    }),
  ]);

  return {
    batchRank: batchMember?.rank || 0,
    batchTotal: batchMember?.batch?._count?.members || 0,
    batchCode: batchMember?.batch?.batchCode || null,
    trackRank: global?.trackRank || 0,
    trackRankTotal: global?.trackRankTotal || 0,
    targetTrack: global?.targetTrack || null,
    platformRank: global?.platformRank || 0,
    platformRankTotal: global?.platformRankTotal || 0,
    weeklyMovement: global?.weeklyMovement || 0,
    performanceScore: global?.performanceScore || 0,
  };
}

// ── Save Weekly Snapshot ──────────────────────
async function saveWeeklySnapshot(batchId) {
  const now = new Date();
  const weekNumber = Math.ceil(now.getDate() / 7);
  const year = now.getFullYear();

  const members = await prisma.batchMember.findMany({
    where: { batchId },
    orderBy: { performanceScore: 'desc' },
  });

  await Promise.all(
    members.map((m, idx) =>
      prisma.leaderboardHistory.create({
        data: {
          userId: m.userId,
          batchId,
          rank: idx + 1,
          score: m.performanceScore,
          weekNumber,
          year,
        },
      })
    )
  );
}

module.exports = {
  getBatchLeaderboard,
  getTrackLeaderboard,
  getPlatformLeaderboard,
  getUserRank,
  saveWeeklySnapshot,
};