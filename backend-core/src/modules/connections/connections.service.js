const { prisma } = require('../../core/database/prismaClient');
const { getCache, setCache, deleteCache } = require('../../core/cache/cacheManager');
const { createNotification } = require('../notifications/notifications.service');

// ── Get All Connections ───────────────────────
async function getConnections(userId) {
  const cacheKey = `connections:${userId}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const connections = await prisma.connection.findMany({
    where: {
      OR: [
        { senderId: userId, status: 'accepted' },
        { receiverId: userId, status: 'accepted' },
      ],
    },
    include: {
      sender: {
        select: {
          id: true, username: true, profilePic: true,
          tier: true, targetTrack: true, level: true,
          masteryPercent: true, trackRank: true, platformRank: true,
          streakCurrent: true,
        },
      },
      receiver: {
        select: {
          id: true, username: true, profilePic: true,
          tier: true, targetTrack: true, level: true,
          masteryPercent: true, trackRank: true, platformRank: true,
          streakCurrent: true,
        },
      },
    },
  });

  const result = connections.map(c => ({
    connectionId: c.id,
    connectedAt: c.createdAt,
    user: c.senderId === userId ? c.receiver : c.sender,
  }));

  await setCache(cacheKey, result, 120);
  return result;
}

// ── Get Pending Requests ──────────────────────
async function getPendingRequests(userId) {
  const requests = await prisma.connection.findMany({
    where: { receiverId: userId, status: 'pending' },
    include: {
      sender: {
        select: {
          id: true, username: true, profilePic: true,
          tier: true, targetTrack: true, level: true,
          masteryPercent: true, platformRank: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return requests.map(r => ({
    requestId: r.id,
    from: r.sender,
    sentAt: r.createdAt,
  }));
}

// ── Send Connection Request ───────────────────
async function sendRequest(senderId, receiverId) {
  if (senderId === receiverId) {
    throw { status: 400, message: 'Cannot connect with yourself' };
  }

  const receiver = await prisma.user.findUnique({
    where: { id: receiverId },
    select: { id: true, username: true },
  });
  if (!receiver) throw { status: 404, message: 'User not found' };

  const existing = await prisma.connection.findFirst({
    where: {
      OR: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    },
  });

  if (existing) {
    if (existing.status === 'accepted') {
      throw { status: 400, message: 'Already connected' };
    }
    if (existing.status === 'pending') {
      throw { status: 400, message: 'Request already sent' };
    }
  }

  const connection = await prisma.connection.create({
    data: { senderId, receiverId, status: 'pending' },
  });

  const sender = await prisma.user.findUnique({
    where: { id: senderId },
    select: { username: true },
  });

  await createNotification({
    userId: receiverId,
    type: 'connection',
    title: 'New Connection Request',
    message: `${sender.username} wants to connect with you`,
  });

  return connection;
}

// ── Accept Request ────────────────────────────
async function acceptRequest(userId, connectionId) {
  const connection = await prisma.connection.findFirst({
    where: { id: connectionId, receiverId: userId, status: 'pending' },
  });

  if (!connection) {
    throw { status: 404, message: 'Connection request not found' };
  }

  const updated = await prisma.connection.update({
    where: { id: connectionId },
    data: { status: 'accepted' },
  });

  const receiver = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true },
  });

  await createNotification({
    userId: connection.senderId,
    type: 'connection',
    title: 'Connection Accepted!',
    message: `${receiver.username} accepted your connection request`,
  });

  await deleteCache(`connections:${userId}`);
  await deleteCache(`connections:${connection.senderId}`);

  return updated;
}

// ── Reject/Remove Connection ──────────────────
async function removeConnection(userId, connectionId) {
  const connection = await prisma.connection.findFirst({
    where: {
      id: connectionId,
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
  });

  if (!connection) throw { status: 404, message: 'Connection not found' };

  await prisma.connection.delete({ where: { id: connectionId } });

  await deleteCache(`connections:${userId}`);
  await deleteCache(`connections:${connection.senderId}`);
  await deleteCache(`connections:${connection.receiverId}`);

  return { message: 'Connection removed' };
}

// ── Check Connection Status ───────────────────
async function getConnectionStatus(userId, targetUserId) {
  const connection = await prisma.connection.findFirst({
    where: {
      OR: [
        { senderId: userId, receiverId: targetUserId },
        { senderId: targetUserId, receiverId: userId },
      ],
    },
  });

  if (!connection) return { status: 'none' };

  if (connection.status === 'accepted') {
    return { status: 'accepted', connectionId: connection.id };
  }

  if (connection.status === 'pending') {
    // Return different status based on who sent the request
    return {
      status: connection.senderId === userId ? 'pending_sent' : 'pending_received',
      connectionId: connection.id,
    };
  }

  return { status: 'none' };
}

module.exports = {
  getConnections,
  getPendingRequests,
  sendRequest,
  acceptRequest,
  removeConnection,
  getConnectionStatus,
};