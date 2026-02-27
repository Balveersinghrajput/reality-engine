const express = require('express');
const router = express.Router();
const {
  calculateController,
  getScoreController,
  getHistoryController,
} = require('./reality.controller');
const { authMiddleware } = require('../../middlewares/auth.middleware');

router.use(authMiddleware);

router.post('/calculate', calculateController);
router.get('/', getScoreController);
router.get('/history', getHistoryController);

module.exports = router;