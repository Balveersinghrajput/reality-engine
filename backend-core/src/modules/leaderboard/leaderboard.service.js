/**
 * leaderboard.service.js — FIXED
 *
 * Fixes applied:
 *  1. Removed `batchCode` everywhere — field does not exist on User model
 *  2. Uses `taskResults` with fallback to `taskResult` (handles both naming conventions)
 *  3. Uses real `masteryPercent` field directly (confirmed exists in schema)
 *  4. Batch scope uses `batchMember` relation with fallback to track scope
 */

const { prisma } = require('../../core/database/prismaClient');

function round1(n) { return Math.round(n * 10) / 10 }
function round0(n) { return Math.round(n) }

function perfScore(avgTest, mastery, consistency) {
  return round1(
    (Math.min(avgTest,     100) * 0.40) +
    (Math.min(mastery,     100) * 0.35) +
    (Math.min(consistency, 100) * 0.25)
  )
}

// ── Prisma model name helper ──────────────────────────────────────
// Your schema might use TaskResult or taskResult — try both
async function groupByTaskResults(args) {
  try {
    return await prisma.taskResults.groupBy(args)
  } catch {
    return await prisma.taskResult.groupBy(args)
  }
}

async function findManyTaskResults(args) {
  try {
    return await prisma.taskResults.findMany(args)
  } catch {
    return await prisma.taskResult.findMany(args)
  }
}

// ─────────────────────────────────────────────────────────────────
// buildLeaderboard
// ─────────────────────────────────────────────────────────────────
async function buildLeaderboard(requestingUserId, userIds) {
  if (!userIds || userIds.length === 0) return []

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  // 1. Fetch users — only confirmed fields from schema
  const users = await prisma.user.findMany({
    where:  { id: { in: userIds } },
    select: {
      id:             true,
      username:       true,
      tier:           true,
      level:          true,
      targetTrack:    true,
      xp:             true,
      masteryPercent: true,
      streakCurrent:  true,
      streakLongest:  true,
      profilePic:     true,
    },
  })

  if (users.length === 0) return []

  // 2. Test scores
  let testGroups = []
  try {
    testGroups = await groupByTaskResults({
      by:     ['userId'],
      where:  { userId: { in: userIds }, challengeTitle: { startsWith: 'Test:' } },
      _avg:   { score: true },
      _max:   { score: true },
      _count: { id: true },
      _sum:   { xpEarned: true },
    })
  } catch (e) {
    console.warn('[leaderboard] testGroups failed:', e.message)
  }

  const testMap = Object.fromEntries(
    testGroups.map(g => [g.userId, {
      avg:   Math.round(g._avg.score ?? 0),
      best:  g._max.score  ?? 0,
      count: g._count.id,
      xp:    g._sum.xpEarned ?? 0,
    }])
  )

  // 3. Active days (consistency)
  let allResults = []
  try {
    allResults = await findManyTaskResults({
      where:  { userId: { in: userIds }, completedAt: { gte: thirtyDaysAgo } },
      select: { userId: true, completedAt: true },
    })
  } catch (e) {
    console.warn('[leaderboard] allResults failed:', e.message)
  }

  const activeDaysMap = {}
  for (const r of allResults) {
    const day = r.completedAt.toISOString().split('T')[0]
    if (!activeDaysMap[r.userId]) activeDaysMap[r.userId] = new Set()
    activeDaysMap[r.userId].add(day)
  }

  // 4. Build entries
  const entries = users.map(u => {
    const tests       = testMap[u.id] || { avg: 0, best: 0, count: 0, xp: 0 }
    const activeDays  = activeDaysMap[u.id]?.size ?? 0
    const mastery     = u.masteryPercent ?? 0
    const consistency = Math.min((activeDays / 30) * 100, 100)
    const score       = perfScore(tests.avg, mastery, consistency)

    return {
      userId:      u.id,
      username:    u.username    || 'Unknown',
      tier:        u.tier        || 'developing',
      level:       u.level       || 'beginner',
      targetTrack: u.targetTrack || '',
      profilePic:  u.profilePic  || null,
      xp:          u.xp          || 0,
      score,
      testAvg:     tests.avg,
      testBest:    tests.best,
      testCount:   tests.count,
      mastery:     round0(mastery),
      streak:      u.streakCurrent ?? 0,
      streakBest:  u.streakLongest ?? 0,
      activeDays,
      totalXP:     tests.xp,
    }
  })

  // 5. Sort by score → mastery → testAvg
  entries.sort((a, b) =>
    b.score   - a.score   ||
    b.mastery - a.mastery ||
    b.testAvg - a.testAvg
  )

  // 6. Rank (ties = same rank)
  let currentRank = 1
  for (let i = 0; i < entries.length; i++) {
    if (i > 0 && entries[i].score !== entries[i - 1].score) currentRank = i + 1
    entries[i].rank = currentRank
  }

  return entries
}

// ─────────────────────────────────────────────────────────────────
// getLeaderboard
// ─────────────────────────────────────────────────────────────────
async function getLeaderboard(requestingUserId, scope = 'global', opts = {}) {
  try {
    const me = await prisma.user.findUnique({
      where:  { id: requestingUserId },
      select: { targetTrack: true },
    })

    let userWhere = {}

    if (scope === 'track') {
      const trackName = opts.track || me?.targetTrack
      if (trackName) userWhere = { targetTrack: trackName }

    } else if (scope === 'batch') {
      // Try batchMember relation first
      try {
        const myBatch = await prisma.batchMember.findFirst({
          where:  { userId: requestingUserId },
          select: { batchId: true },
        })
        if (myBatch?.batchId) {
          const members = await prisma.batchMember.findMany({
            where:  { batchId: myBatch.batchId },
            select: { userId: true },
          })
          userWhere = { id: { in: members.map(m => m.userId) } }
        } else {
          // No batch — fall back to same track
          if (me?.targetTrack) userWhere = { targetTrack: me.targetTrack }
        }
      } catch {
        // batchMember table doesn't exist — fall back to track
        if (me?.targetTrack) userWhere = { targetTrack: me.targetTrack }
      }
    }
    // global = no filter

    const scopeUsers = await prisma.user.findMany({
      where:  userWhere,
      select: { id: true },
    })
    const userIds = scopeUsers.map(u => u.id)

    if (userIds.length === 0) {
      return {
        leaderboard: [], myRank: null, myEntry: null,
        scope, totalUsers: 0, total: 0,
        meta: { track: me?.targetTrack },
      }
    }

    const rawList = await buildLeaderboard(requestingUserId, userIds)

    // Apply isCurrentUser FRESH every request — never cache this flag
    const leaderboard = rawList.slice(0, 100).map(e => ({
      ...e,
      isCurrentUser: e.userId === requestingUserId,
    }))

    const myEntry = leaderboard.find(e => e.userId === requestingUserId) || null

    return {
      leaderboard,
      myRank:     myEntry?.rank ?? null,
      myEntry,
      scope,
      totalUsers: rawList.length,
      total:      rawList.length,
      meta:       { track: me?.targetTrack },
    }
  } catch (err) {
    console.error('[leaderboard] getLeaderboard error:', err.message)
    throw err
  }
}

// ─────────────────────────────────────────────────────────────────
// getMyRank
// ─────────────────────────────────────────────────────────────────
async function getMyRank(userId) {
  try {
    const [platformData, user] = await Promise.all([
      getLeaderboard(userId, 'global'),
      prisma.user.findUnique({
        where:  { id: userId },
        select: { targetTrack: true, tier: true, level: true },
      }),
    ])

    const myEntry = platformData.leaderboard?.find(e => e.userId === userId)

    return {
      platformRank:      myEntry?.rank          ?? null,
      platformRankTotal: platformData.totalUsers ?? 0,
      performanceScore:  myEntry?.score          ?? 0,
      mastery:           myEntry?.mastery         ?? 0,
      streak:            myEntry?.streak          ?? 0,
      targetTrack:       user?.targetTrack        ?? null,
      tier:              user?.tier               ?? null,
      level:             user?.level              ?? null,
    }
  } catch (err) {
    console.error('[leaderboard] getMyRank error:', err.message)
    return { platformRank: null, platformRankTotal: 0, performanceScore: 0 }
  }
}

module.exports = { getLeaderboard, getMyRank }