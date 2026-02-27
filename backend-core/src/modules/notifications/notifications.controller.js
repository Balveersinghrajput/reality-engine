const notificationsService = require('./notifications.service');
const { successResponse } = require('../../utils/response.helper');

async function getNotificationsController(req, res, next) {
  try {
    const data = await notificationsService.getNotifications(req.user.id);
    return successResponse(res, data, 'Notifications fetched');
  } catch (err) { next(err); }
}

async function markAsReadController(req, res, next) {
  try {
    const data = await notificationsService.markAsRead(req.user.id, req.params.id);
    return successResponse(res, data, 'Marked as read');
  } catch (err) { next(err); }
}

async function deleteNotificationController(req, res, next) {
  try {
    const data = await notificationsService.deleteNotification(req.user.id, req.params.id);
    return successResponse(res, data, 'Deleted');
  } catch (err) { next(err); }
}

async function getUnreadCountController(req, res, next) {
  try {
    const data = await notificationsService.getUnreadCount(req.user.id);
    return successResponse(res, data, 'Unread count fetched');
  } catch (err) { next(err); }
}

module.exports = {
  getNotificationsController,
  markAsReadController,
  deleteNotificationController,
  getUnreadCountController,
};