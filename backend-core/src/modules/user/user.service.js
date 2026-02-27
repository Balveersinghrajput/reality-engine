const { prisma } = require('../../core/database/prismaClient');
const { getCache, setCache, deleteCache } = require('../../core/cache/cacheManager');

// ── Get Dashboard ─────────────────────────────
async function getDashboard(userId) {
  const cacheKey = `dashboard:${userId}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      profilePic: true,
      targetTrack: true,
      level: true,
      mode: true,
      tier: true,
      masteryPercent: true,
      realityScore: true,
      streakCurrent: true,
      streakLongest: true,
      trackRank: true,
      trackRankTotal: true,
      platformRank: true,
      platformRankTotal: true,
      createdAt: true,
      batchMember: {
        select: {
          rank: true,
          performanceScore: true,
          batch: {
            select: {
              id: true,
              batchCode: true,
              targetTrack: true,
              level: true,
              _count: { select: { members: true } },
            },
          },
        },
      },
      globalLeaderboard: {
        select: {
          trackRank: true,
          trackRankTotal: true,
          platformRank: true,
          platformRankTotal: true,
          weeklyMovement: true,
          performanceScore: true,
        },
      },
      tasks: {
        select: { status: true },
      },
      testResults: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          score: true,
          passed: true,
          difficulty: true,
          createdAt: true,
        },
      },
      realityScores: {
        orderBy: { updatedAt: 'desc' },
        take: 1,
        select: {
          score: true,
          industryGap: true,
          interviewScore: true,
          codeQualityScore: true,
          speedScore: true,
          consistencyScore: true,
        },
      },
    },
  });

  if (!user) throw { status: 404, message: 'User not found' };

  // Calculate task stats
  const totalTasks = user.tasks.length;
  const completedTasks = user.tasks.filter(t => t.status === 'completed').length;
  const taskCompletionRate = totalTasks > 0
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0;

  // Batch info
  const batchRank = user.batchMember?.rank || 0;
  const batchTotal = user.batchMember?.batch?._count?.members || 0;
  const batchCode = user.batchMember?.batch?.batchCode || null;
  const batchId = user.batchMember?.batch?.id || null;
  const performanceScore = user.batchMember?.performanceScore || 0;

  // Global rank
  const global = user.globalLeaderboard;

  const dashboard = {
    profile: {
      id: user.id,
      username: user.username,
      email: user.email,
      profilePic: user.profilePic,
      targetTrack: user.targetTrack,
      level: user.level,
      mode: user.mode,
      tier: user.tier,
      createdAt: user.createdAt,
    },
    performance: {
      masteryPercent: user.masteryPercent,
      realityScore: user.realityScore,
      performanceScore,
      taskCompletionRate,
      totalTasks,
      completedTasks,
      streakCurrent: user.streakCurrent,
      streakLongest: user.streakLongest,
    },
    ranks: {
      batchRank,
      batchTotal,
      batchCode,
      batchId,
      trackRank: global?.trackRank || user.trackRank || 0,
      trackRankTotal: global?.trackRankTotal || user.trackRankTotal || 0,
      platformRank: global?.platformRank || user.platformRank || 0,
      platformRankTotal: global?.platformRankTotal || user.platformRankTotal || 0,
      weeklyMovement: global?.weeklyMovement || 0,
    },
    recentTests: user.testResults,
    realityScore: user.realityScores[0] || null,
  };

  await setCache(cacheKey, dashboard, 120); // cache 2 min
  return dashboard;
}

// ── Get Profile ───────────────────────────────
async function getProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      profilePic: true,
      targetTrack: true,
      level: true,
      mode: true,
      tier: true,
      masteryPercent: true,
      realityScore: true,
      streakCurrent: true,
      streakLongest: true,
      trackRank: true,
      trackRankTotal: true,
      platformRank: true,
      platformRankTotal: true,
      createdAt: true,
      batchMember: {
        select: {
          rank: true,
          performanceScore: true,
          batch: { select: { batchCode: true } },
        },
      },
      globalLeaderboard: true,
      _count: {
        select: {
          tasks: true,
          testResults: true,
          connectionsAsSender: true,
        },
      },
    },
  });

  if (!user) throw { status: 404, message: 'User not found' };
  return user;
}

// ── Get Public Profile ────────────────────────
async function getPublicProfile(username) {
  const cacheKey = `public_profile:${username}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      profilePic: true,
      targetTrack: true,
      level: true,
      tier: true,
      masteryPercent: true,
      realityScore: true,
      streakCurrent: true,
      streakLongest: true,
      trackRank: true,
      trackRankTotal: true,
      platformRank: true,
      platformRankTotal: true,
      createdAt: true,
      batchMember: {
        select: {
          rank: true,
          batch: { select: { batchCode: true } },
        },
      },
      globalLeaderboard: {
        select: {
          trackRank: true,
          trackRankTotal: true,
          platformRank: true,
          platformRankTotal: true,
          weeklyMovement: true,
        },
      },
      _count: {
        select: { tasks: true, testResults: true },
      },
    },
  });

  if (!user) throw { status: 404, message: 'User not found' };

  await setCache(cacheKey, user, 300);
  return user;
}

// ── Update Profile ────────────────────────────
async function updateProfile(userId, data) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      username: true,
      email: true,
      profilePic: true,
      mode: true,
      tier: true,
      targetTrack: true,
      level: true,
    },
  });

  await deleteCache(`dashboard:${userId}`);
  await deleteCache(`public_profile:${updated.username}`);
  return updated;
}

// ── Search Users ──────────────────────────────
async function searchUsers(query, currentUserId) {
  const users = await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: currentUserId } },
        {
          OR: [
            { username: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
      ],
    },
    select: {
      id: true,
      username: true,
      profilePic: true,
      targetTrack: true,
      level: true,
      tier: true,
      trackRank: true,
      platformRank: true,
      masteryPercent: true,
      batchMember: {
        select: { rank: true, batch: { select: { batchCode: true } } },
      },
    },
    take: 20,
  });

  return users;
}

// ── Compare Users ─────────────────────────────
async function compareUsers(userId, targetUserId) {
  const [me, target] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        profilePic: true,
        targetTrack: true,
        tier: true,
        masteryPercent: true,
        realityScore: true,
        streakCurrent: true,
        trackRank: true,
        platformRank: true,
        batchMember: { select: { rank: true, performanceScore: true } },
        globalLeaderboard: { select: { trackRank: true, platformRank: true, weeklyMovement: true } },
      },
    }),
    prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        username: true,
        profilePic: true,
        targetTrack: true,
        tier: true,
        masteryPercent: true,
        realityScore: true,
        streakCurrent: true,
        trackRank: true,
        platformRank: true,
        batchMember: { select: { rank: true, performanceScore: true } },
        globalLeaderboard: { select: { trackRank: true, platformRank: true, weeklyMovement: true } },
      },
    }),
  ]);

  if (!target) throw { status: 404, message: 'User not found' };

  return {
    you: me,
    rival: target,
    comparison: {
      masteryDiff: (me.masteryPercent - target.masteryPercent).toFixed(1),
      realityScoreDiff: (me.realityScore - target.realityScore).toFixed(1),
      streakDiff: me.streakCurrent - target.streakCurrent,
      platformRankDiff: target.platformRank - me.platformRank,
      trackRankDiff: target.trackRank - me.trackRank,
      performanceDiff: (
        (me.batchMember?.performanceScore || 0) -
        (target.batchMember?.performanceScore || 0)
      ).toFixed(1),
      winner: me.masteryPercent >= target.masteryPercent ? me.username : target.username,
    },
  };
}

module.exports = {
  getDashboard,
  getProfile,
  getPublicProfile,
  updateProfile,
  searchUsers,
  compareUsers,
};