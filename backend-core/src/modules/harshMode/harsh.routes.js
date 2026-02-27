const express = require('express');
const router = express.Router();
const {
  checkTriggersController,
  getHarshLogsController,
  getHarshStatsController,
  toggleModeController,
} = require('./harsh.controller');
const { authMiddleware } = require('../../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/logs', getHarshLogsController);
router.get('/stats', getHarshStatsController);
router.post('/check', checkTriggersController);
router.patch('/mode', toggleModeController);

module.exports = router;