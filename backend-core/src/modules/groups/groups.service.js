const { prisma } = require('../../core/database/prismaClient');
const { getCache, setCache, deleteCache } = require('../../core/cache/cacheManager');
const { createNotification } = require('../notifications/notifications.service');

// ── Get My Group ──────────────────────────────
async function getMyGroup(userId) {
  const member = await prisma.groupMember.findUnique({
    where: { userId },
    include: {
      group: {
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true, username: true, profilePic: true,
                  tier: true, masteryPercent: true,
                  trackRank: true, platformRank: true,
                  streakCurrent: true,
                },
              },
            },
          },
          batch: { select: { batchCode: true, targetTrack: true } },
        },
      },
    },
  });

  if (!member) return { group: null, message: 'Not in a group yet' };
  return member.group;
}

// ── Create Group ──────────────────────────────
async function createGroup(userId, data) {
  const batchMember = await prisma.batchMember.findUnique({
    where: { userId },
    include: { batch: true },
  });

  if (!batchMember) throw { status: 400, message: 'You are not in a batch' };

  const existingMember = await prisma.groupMember.findUnique({
    where: { userId },
  });
  if (existingMember) throw { status: 400, message: 'You are already in a group' };

  const group = await prisma.group.create({
    data: {
      batchId: batchMember.batchId,
      name: data.name,
      projectTitle: data.projectTitle,
      deadline: data.deadline ? new Date(data.deadline) : null,
    },
  });

  // Add creator as leader
  await prisma.groupMember.create({
    data: {
      groupId: group.id,
      userId,
      role: 'leader',
    },
  });

  return group;
}

// ── Invite To Group ───────────────────────────
async function inviteToGroup(leaderId, targetUserId) {
  const leaderMember = await prisma.groupMember.findUnique({
    where: { userId: leaderId },
    include: { group: true },
  });

  if (!leaderMember || leaderMember.role !== 'leader') {
    throw { status: 403, message: 'Only group leader can invite' };
  }

  const targetBatch = await prisma.batchMember.findUnique({
    where: { userId: targetUserId },
  });

  if (!targetBatch || targetBatch.batchId !== leaderMember.group.batchId) {
    throw { status: 400, message: 'User must be in same batch' };
  }

  const alreadyInGroup = await prisma.groupMember.findUnique({
    where: { userId: targetUserId },
  });
  if (alreadyInGroup) throw { status: 400, message: 'User already in a group' };

  const member = await prisma.groupMember.create({
    data: {
      groupId: leaderMember.groupId,
      userId: targetUserId,
      role: 'member',
    },
  });

  const leader = await prisma.user.findUnique({
    where: { id: leaderId },
    select: { username: true },
  });

  await createNotification({
    userId: targetUserId,
    type: 'group',
    title: 'Added to Group!',
    message: `${leader.username} added you to group "${leaderMember.group.name}"`,
  });

  await deleteCache(`group:${leaderMember.groupId}`);
  return member;
}

// ── Get Group Messages ────────────────────────
async function getGroupMessages(userId, groupId, channel = 'general') {
  const member = await prisma.groupMember.findFirst({
    where: { userId, groupId },
  });
  if (!member) throw { status: 403, message: 'Not a member of this group' };

  const cacheKey = `group_messages:${groupId}:${channel}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const messages = await prisma.message.findMany({
    where: { groupId, channel },
    orderBy: { createdAt: 'asc' },
    take: 50,
    include: {
      sender: {
        select: {
          id: true, username: true, profilePic: true, tier: true,
        },
      },
    },
  });

  await setCache(cacheKey, messages, 30);
  return messages;
}

// ── Send Group Message ────────────────────────
async function sendGroupMessage(userId, groupId, content, channel = 'general') {
  const member = await prisma.groupMember.findFirst({
    where: { userId, groupId },
  });
  if (!member) throw { status: 403, message: 'Not a member of this group' };

  const message = await prisma.message.create({
    data: { senderId: userId, groupId, content, channel },
    include: {
      sender: {
        select: { id: true, username: true, profilePic: true, tier: true },
      },
    },
  });

  await deleteCache(`group_messages:${groupId}:${channel}`);

  // Emit to group room
  try {
    const { getIO } = require('../../sockets/index');
    const io = getIO();
    io.to(`group_${groupId}`).emit('message:new', { ...message, room: 'group' });
  } catch (e) {}

  return message;
}

// ── Get Batch Messages ────────────────────────
async function getBatchMessages(userId, channel = 'general') {
  const batchMember = await prisma.batchMember.findUnique({
    where: { userId },
    select: { batchId: true },
  });
  if (!batchMember) throw { status: 400, message: 'Not in a batch' };

  const cacheKey = `batch_messages:${batchMember.batchId}:${channel}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const messages = await prisma.message.findMany({
    where: { batchId: batchMember.batchId, channel },
    orderBy: { createdAt: 'asc' },
    take: 50,
    include: {
      sender: {
        select: { id: true, username: true, profilePic: true, tier: true },
      },
    },
  });

  await setCache(cacheKey, messages, 30);
  return messages;
}

// ── Send Batch Message ────────────────────────
async function sendBatchMessage(userId, content, channel = 'general') {
  const batchMember = await prisma.batchMember.findUnique({
    where: { userId },
    select: { batchId: true },
  });
  if (!batchMember) throw { status: 400, message: 'Not in a batch' };

  const message = await prisma.message.create({
    data: {
      senderId: userId,
      batchId: batchMember.batchId,
      content,
      channel,
    },
    include: {
      sender: {
        select: { id: true, username: true, profilePic: true, tier: true },
      },
    },
  });

  await deleteCache(`batch_messages:${batchMember.batchId}:${channel}`);

  try {
    const { getIO } = require('../../sockets/index');
    const io = getIO();
    io.to(`batch_${batchMember.batchId}`).emit('message:new', {
      ...message,
      room: 'batch',
    });
  } catch (e) {}

  return message;
}

// ── Update Group Score ────────────────────────
async function updateGroupScore(groupId, score) {
  return prisma.group.update({
    where: { id: groupId },
    data: { score },
  });
}

module.exports = {
  getMyGroup,
  createGroup,
  inviteToGroup,
  getGroupMessages,
  sendGroupMessage,
  getBatchMessages,
  sendBatchMessage,
  updateGroupScore,
};