const express = require('express');
const router = express.Router();
const {
  generateTestController,
  submitTestController,
  getTestHistoryController,
  getTestResultController,
} = require('./test.controller');
const { authMiddleware } = require('../../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/generate/:taskId', generateTestController);
router.post('/submit', submitTestController);
router.get('/history', getTestHistoryController);
router.get('/:id/result', getTestResultController);

module.exports = router;