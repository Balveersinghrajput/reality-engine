const express = require('express');
const router = express.Router();
const {
  getNotificationsController,
  markAsReadController,
  deleteNotificationController,
  getUnreadCountController,
} = require('./notifications.controller');
const { authMiddleware } = require('../../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/', getNotificationsController);
router.get('/unread-count', getUnreadCountController);
router.patch('/:id/read', markAsReadController);
router.delete('/:id', deleteNotificationController);

module.exports = router;