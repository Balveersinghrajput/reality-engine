const cron = require('node-cron')
const { prisma } = require('../core/database/prismaClient')
const logger = require('../core/logger/logger')

async function recalculateGlobalRanks() {
  try {
    logger.info('🔄 Starting global rank recalculation...')

    // Get all active users with their performance
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        targetTrack: true,
        masteryPercent: true,
        batchMember: { select: { performanceScore: true } },
        globalLeaderboard: { select: { platformRank: true, trackRank: true } },
      },
    })

    // Group by track
    const byTrack = {}
    users.forEach(u => {
      if (!byTrack[u.targetTrack]) byTrack[u.targetTrack] = []
      byTrack[u.targetTrack].push(u)
    })

    // Sort each track by performance
    const trackRankMap = {}
    Object.entries(byTrack).forEach(([track, trackUsers]) => {
      trackUsers
        .sort((a, b) => (b.batchMember?.performanceScore || 0) - (a.batchMember?.performanceScore || 0))
        .forEach((u, idx) => {
          trackRankMap[u.id] = {
            trackRank: idx + 1,
            trackRankTotal: trackUsers.length,
            targetTrack: track,
          }
        })
    })

    // Sort all users by performance for platform rank
    const allSorted = [...users].sort(
      (a, b) => (b.batchMember?.performanceScore || 0) - (a.batchMember?.performanceScore || 0)
    )

    // Upsert GlobalLeaderboard for every user
    for (let i = 0; i < allSorted.length; i++) {
      const u = allSorted[i]
      const tRank = trackRankMap[u.id]
      const prevPlatform = u.globalLeaderboard?.platformRank || 0
      const prevTrack = u.globalLeaderboard?.trackRank || 0
      const newPlatform = i + 1
      const newTrack = tRank?.trackRank || 0

      await prisma.globalLeaderboard.upsert({
        where: { userId: u.id },
        update: {
          platformRank: newPlatform,
          platformRankTotal: allSorted.length,
          trackRank: newTrack,
          trackRankTotal: tRank?.trackRankTotal || 0,
          targetTrack: tRank?.targetTrack || u.targetTrack,
          performanceScore: u.batchMember?.performanceScore || 0,
          weeklyMovement: prevPlatform ? prevPlatform - newPlatform : 0,
          prevPlatformRank: prevPlatform,
          prevTrackRank: prevTrack,
          updatedAt: new Date(),
        },
        create: {
          userId: u.id,
          platformRank: newPlatform,
          platformRankTotal: allSorted.length,
          trackRank: newTrack,
          trackRankTotal: tRank?.trackRankTotal || 0,
          targetTrack: tRank?.targetTrack || u.targetTrack,
          performanceScore: u.batchMember?.performanceScore || 0,
          weeklyMovement: 0,
          prevPlatformRank: 0,
          prevTrackRank: 0,
        },
      })

      // Update user table too
      await prisma.user.update({
        where: { id: u.id },
        data: {
          platformRank: newPlatform,
          platformRankTotal: allSorted.length,
          trackRank: newTrack,
          trackRankTotal: tRank?.trackRankTotal || 0,
        },
      })
    }

    logger.info(`✅ Global ranks updated for ${allSorted.length} users`)
  } catch (err) {
    logger.error('❌ Rank recalculation failed: ' + err.message)
  }
}

// Run every 6 hours
function startRankJob() {
  cron.schedule('0 */6 * * *', recalculateGlobalRanks)
  logger.info('📅 Rank recalculation job scheduled (every 6 hours)')
}

module.exports = { startRankJob, recalculateGlobalRanks }