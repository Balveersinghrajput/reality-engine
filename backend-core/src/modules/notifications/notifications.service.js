const { prisma } = require('../../core/database/prismaClient');
const { getCache, setCache, deleteCache } = require('../../core/cache/cacheManager');

// ── Create Notification ───────────────────────
async function createNotification({ userId, type, title, message }) {
  const notification = await prisma.notification.create({
    data: { userId, type, title, message },
  });

  await deleteCache(`notifications:${userId}`);

  // Emit socket event if user is online
  try {
    const { getIO } = require('../../sockets/index');
    const io = getIO();
    io.to(`user_${userId}`).emit('notification:new', notification);
  } catch (e) {}

  return notification;
}

// ── Get Notifications ─────────────────────────
async function getNotifications(userId) {
  const cacheKey = `notifications:${userId}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const result = { notifications, unreadCount };
  await setCache(cacheKey, result, 60);
  return result;
}

// ── Mark As Read ──────────────────────────────
async function markAsRead(userId, notificationId) {
  if (notificationId === 'all') {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    await deleteCache(`notifications:${userId}`);
    return { message: 'All notifications marked as read' };
  }

  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });

  if (!notification) throw { status: 404, message: 'Notification not found' };

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });

  await deleteCache(`notifications:${userId}`);
  return updated;
}

// ── Delete Notification ───────────────────────
async function deleteNotification(userId, notificationId) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });

  if (!notification) throw { status: 404, message: 'Notification not found' };

  await prisma.notification.delete({ where: { id: notificationId } });
  await deleteCache(`notifications:${userId}`);

  return { message: 'Notification deleted' };
}

// ── Get Unread Count ──────────────────────────
async function getUnreadCount(userId) {
  const count = await prisma.notification.count({
    where: { userId, isRead: false },
  });
  return { unreadCount: count };
}

module.exports = {
  createNotification,
  getNotifications,
  markAsRead,
  deleteNotification,
  getUnreadCount,
};