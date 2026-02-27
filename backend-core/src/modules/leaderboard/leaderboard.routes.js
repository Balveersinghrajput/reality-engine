const express = require('express');
const router = express.Router();
const {
  getBatchLeaderboardController,
  getTrackLeaderboardController,
  getPlatformLeaderboardController,
  getUserRankController,
} = require('./leaderboard.controller');
const { authMiddleware } = require('../../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/batch/:batchId', getBatchLeaderboardController);
router.get('/track/:track', getTrackLeaderboardController);
router.get('/platform', getPlatformLeaderboardController);
router.get('/my-rank', getUserRankController);

module.exports = router;