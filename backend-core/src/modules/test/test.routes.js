const express = require('express');
const router  = express.Router();

const {
  generateTestController,
  submitTestController,
  getTestHistoryController,
  getTestResultController,
  getTestLeaderboardController,
} = require('./test.controller');

const { authMiddleware } = require('../../middlewares/auth.middleware');

router.use(authMiddleware);

// ── GET  /api/tests/history              → all past results for user
// ── GET  /api/tests/leaderboard          → global leaderboard (?topic=)
// ── GET  /api/tests/:id/result           → single result by id
// ── POST /api/tests/generate/:taskId     → generate questions for a task
// ── POST /api/tests/submit               → grade + save a completed test

router.get ('/history',              getTestHistoryController);
router.get ('/leaderboard',          getTestLeaderboardController);
router.post('/generate/:taskId',     generateTestController);
router.post('/submit',               submitTestController);
router.get ('/:id/result',           getTestResultController);

module.exports = router;