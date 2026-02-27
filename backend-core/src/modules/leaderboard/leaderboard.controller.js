const leaderboardService = require('./leaderboard.service');
const { successResponse } = require('../../utils/response.helper');

async function getBatchLeaderboardController(req, res, next) {
  try {
    const data = await leaderboardService.getBatchLeaderboard(
      req.params.batchId,
      req.user.id
    );
    return successResponse(res, data, 'Batch leaderboard fetched');
  } catch (err) { next(err); }
}

async function getTrackLeaderboardController(req, res, next) {
  try {
    const track = req.params.track || req.user.targetTrack;
    const data = await leaderboardService.getTrackLeaderboard(track, req.user.id);
    return successResponse(res, data, 'Track leaderboard fetched');
  } catch (err) { next(err); }
}

async function getPlatformLeaderboardController(req, res, next) {
  try {
    const data = await leaderboardService.getPlatformLeaderboard(req.user.id);
    return successResponse(res, data, 'Platform leaderboard fetched');
  } catch (err) { next(err); }
}

async function getUserRankController(req, res, next) {
  try {
    const data = await leaderboardService.getUserRank(req.user.id);
    return successResponse(res, data, 'User rank fetched');
  } catch (err) { next(err); }
}

module.exports = {
  getBatchLeaderboardController,
  getTrackLeaderboardController,
  getPlatformLeaderboardController,
  getUserRankController,
};