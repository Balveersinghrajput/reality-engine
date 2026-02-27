const { deleteCache } = require('../../core/cache/cacheManager');

async function invalidateBatchCache(batchId) {
  await deleteCache(`leaderboard:batch:${batchId}`);
}

async function invalidateTrackCache(track) {
  await deleteCache(`leaderboard:track:${track}`);
}

async function invalidatePlatformCache() {
  await deleteCache('leaderboard:platform:top100');
}

module.exports = {
  invalidateBatchCache,
  invalidateTrackCache,
  invalidatePlatformCache,
};