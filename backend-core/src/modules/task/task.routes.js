const express = require('express');
const router = express.Router();
const {
  getTasksController,
  getTaskController,
  getTodayTaskController,
  getTaskStatsController,
  startTimerController,
  stopTimerController,
  completeTaskController,
  saveReflectionController,
} = require('./task.controller');
const { authMiddleware } = require('../../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/', getTasksController);
router.get('/today', getTodayTaskController);
router.get('/stats', getTaskStatsController);
router.get('/:id', getTaskController);
router.post('/:id/timer/start', startTimerController);
router.post('/:id/timer/stop', stopTimerController);
router.post('/:id/complete', completeTaskController);
router.post('/:id/reflection', saveReflectionController);

module.exports = router;