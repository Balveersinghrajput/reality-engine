const express = require('express');
const router = express.Router();
const {
  chatController,
  generateTasksController,
  reviewCodeController,
  getInteractionHistoryController,
} = require('./ai.controller');
const { authMiddleware } = require('../../middlewares/auth.middleware');
const { aiRateLimiter } = require('../../middlewares/rateLimiter.middleware');

router.use(authMiddleware);
router.use(aiRateLimiter);

router.post('/chat', chatController);
router.post('/generate-tasks', generateTasksController);
router.post('/review-code', reviewCodeController);
router.get('/history', getInteractionHistoryController);

module.exports = router;