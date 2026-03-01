// src/features/chat/chat.service.js
const { prisma } = require('../../core/database/prismaClient');
const { getIO }  = require('../../sockets');

const PAGE_SIZE = 40;

async function requireConversation(conversationId, userId) {
  const conv = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ user1Id: userId }, { user2Id: userId }],
    },
  });
  if (!conv) throw { status: 403, message: 'Not part of this conversation' };
  return conv;
}

// ── Get or create 1-to-1 conversation ────────────────────────────
async function getOrCreateConversation(userId, targetUserId) {
  if (userId === targetUserId)
    throw { status: 400, message: 'Cannot chat with yourself' };

  const [user1Id, user2Id] = [userId, targetUserId].sort();

  let conv = await prisma.conversation.findUnique({
    where: { user1Id_user2Id: { user1Id, user2Id } },
    include: {
      user1: { select: { id: true, username: true, profilePic: true, tier: true } },
      user2: { select: { id: true, username: true, profilePic: true, tier: true } },
    },
  });

  if (!conv) {
    conv = await prisma.conversation.create({
      data: { user1Id, user2Id },
      include: {
        user1: { select: { id: true, username: true, profilePic: true, tier: true } },
        user2: { select: { id: true, username: true, profilePic: true, tier: true } },
      },
    });
  }

  const other = conv.user1Id === userId ? conv.user2 : conv.user1;
  return { conversationId: conv.id, other };
}

// ── List all conversations for a user ────────────────────────────
async function getConversations(userId) {
  const convs = await prisma.conversation.findMany({
    where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
    orderBy: { lastMessageAt: 'desc' },
    include: {
      user1: { select: { id: true, username: true, profilePic: true, tier: true } },
      user2: { select: { id: true, username: true, profilePic: true, tier: true } },
    },
  });

  return convs.map(c => ({
    conversationId: c.id,
    lastMessage:    c.lastMessage,
    lastMessageAt:  c.lastMessageAt,
    unreadCount:    0,
    other: c.user1Id === userId ? c.user2 : c.user1,
  }));
}

// ── Get paginated messages ────────────────────────────────────────
async function getMessages(conversationId, userId, cursor) {
  await requireConversation(conversationId, userId);

  const messages = await prisma.directMessage.findMany({
    where:   { conversationId },
    orderBy: { createdAt: 'desc' },
    take:    PAGE_SIZE,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { sender: { select: { id: true, username: true, profilePic: true } } },
  });

  return messages.reverse();
}

// ── KEY FIX: emit to BOTH users via personal rooms ────────────────
// Personal rooms (user_${id}) are joined immediately on socket connect,
// so delivery is instant regardless of which page the user is on.
// conv_ room alone is unreliable — the sender may not have joined it yet.
function emitToConversationUsers(conv, senderId, event, payload) {
  try {
    const io = getIO();
    const receiverId = conv.user1Id === senderId ? conv.user2Id : conv.user1Id;

    // ✅ Sender gets it → replaces the optimistic bubble on their screen
    io.to(`user_${senderId}`).emit(event, payload);

    // ✅ Receiver gets it → instant delivery even if not on chat page
    io.to(`user_${receiverId}`).emit(event, payload);
  } catch (_) {}
}

async function emitAndNotify(conv, senderId, message, lastMessage) {
  try {
    const io = getIO();
    const receiverId = conv.user1Id === senderId ? conv.user2Id : conv.user1Id;

    // ✅ Emit new_message to BOTH users via personal rooms (not conv_ room)
    io.to(`user_${senderId}`).emit('new_message', message);
    io.to(`user_${receiverId}`).emit('new_message', message);

    // Update receiver's conversations list
    io.to(`user_${receiverId}`).emit('conversation_updated', {
      conversationId: conv.id,
      lastMessage,
      lastMessageAt: message.createdAt,
      sender: message.sender,
    });

    // Push notification to receiver
    io.to(`user_${receiverId}`).emit('notification:new', {
      type: 'message',
      title: `New message from ${message.sender?.username}`,
      message: lastMessage.slice(0, 60),
      conversationId: conv.id,
      senderId,
    });
  } catch (_) {}
}

// ── Send text message ─────────────────────────────────────────────
async function sendMessage(conversationId, senderId, { content }) {
  const conv = await requireConversation(conversationId, senderId);

  const message = await prisma.directMessage.create({
    data: { conversationId, senderId, type: 'text', content },
    include: { sender: { select: { id: true, username: true, profilePic: true } } },
  });

  const preview = content.slice(0, 100);
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessage: preview, lastMessageAt: new Date() },
  });

  await emitAndNotify(conv, senderId, message, preview);
  return message;
}

// ── Send code snippet ─────────────────────────────────────────────
async function sendCodeMessage(conversationId, senderId, { code, language, caption }) {
  const conv = await requireConversation(conversationId, senderId);
  const lang    = language || 'plaintext';
  const preview = `📋 ${lang} snippet`;

  const message = await prisma.directMessage.create({
    data: {
      conversationId, senderId,
      type: 'code', content: code,
      codeLanguage: lang, fileName: caption || null,
    },
    include: { sender: { select: { id: true, username: true, profilePic: true } } },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessage: preview, lastMessageAt: new Date() },
  });

  await emitAndNotify(conv, senderId, message, preview);
  return message;
}

// ── Send media / file ─────────────────────────────────────────────
async function sendMediaMessage(conversationId, senderId, { fileUrl, fileName, fileSize, mimeType, type, caption }) {
  const conv = await requireConversation(conversationId, senderId);

  const msgType = type
    || (mimeType?.startsWith('image/') ? 'image'
      : mimeType?.startsWith('video/') ? 'video'
      : 'file');

  const preview = msgType === 'image' ? '🖼 Photo'
                : msgType === 'video' ? '🎥 Video'
                : `📎 ${fileName || 'File'}`;

  const message = await prisma.directMessage.create({
    data: {
      conversationId, senderId,
      type: msgType, content: caption || preview,
      fileUrl, fileName, fileSize, mimeType,
    },
    include: { sender: { select: { id: true, username: true, profilePic: true } } },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessage: preview, lastMessageAt: new Date() },
  });

  await emitAndNotify(conv, senderId, message, preview);
  return message;
}

// ── Soft-delete a single message ──────────────────────────────────
async function deleteMessage(messageId, userId) {
  const msg = await prisma.directMessage.findFirst({
    where: { id: messageId, senderId: userId },
  });
  if (!msg) throw { status: 404, message: 'Message not found or not yours' };

  const updated = await prisma.directMessage.update({
    where: { id: messageId },
    data: { isDeleted: true, deletedAt: new Date(), content: 'This message was deleted' },
  });

  // Get conv to find receiver, then emit to both via personal rooms
  const conv = await prisma.conversation.findUnique({ where: { id: msg.conversationId } });
  if (conv) {
    emitToConversationUsers(conv, userId, 'message_deleted', {
      messageId, conversationId: msg.conversationId,
    });
  }

  return updated;
}

// ── Delete for everyone ───────────────────────────────────────────
async function deleteMessageForEveryone(messageId, userId) {
  const msg = await prisma.directMessage.findFirst({
    where: { id: messageId, senderId: userId },
  });
  if (!msg) throw { status: 404, message: 'Message not found or not yours' };

  await prisma.directMessage.update({
    where: { id: messageId },
    data: { isDeleted: true, deletedAt: new Date(), content: 'This message was deleted' },
  });

  const conv = await prisma.conversation.findUnique({ where: { id: msg.conversationId } });
  if (conv) {
    emitToConversationUsers(conv, userId, 'message_deleted', {
      messageId, conversationId: msg.conversationId,
    });
  }

  return { deleted: true };
}

// ── Soft-delete multiple messages ─────────────────────────────────
async function deleteMessages(messageIds, userId) {
  await prisma.directMessage.updateMany({
    where: { id: { in: messageIds }, senderId: userId },
    data: { isDeleted: true, deletedAt: new Date(), content: 'This message was deleted' },
  });

  const ref = await prisma.directMessage.findFirst({ where: { id: { in: messageIds } } });
  if (ref) {
    const conv = await prisma.conversation.findUnique({ where: { id: ref.conversationId } });
    if (conv) {
      emitToConversationUsers(conv, userId, 'messages_deleted', {
        messageIds, conversationId: ref.conversationId,
      });
    }
  }

  return { deleted: messageIds.length };
}

// ── Clear all own messages in a conversation ──────────────────────
async function clearConversation(conversationId, userId) {
  await requireConversation(conversationId, userId);
  await prisma.directMessage.updateMany({
    where: { conversationId, senderId: userId, isDeleted: false },
    data: { isDeleted: true, deletedAt: new Date(), content: 'This message was deleted' },
  });
  return { message: 'Conversation cleared' };
}

module.exports = {
  getOrCreateConversation,
  getConversations,
  getMessages,
  sendMessage,
  sendCodeMessage,
  sendMediaMessage,
  deleteMessage,
  deleteMessageForEveryone,
  deleteMessages,
  clearConversation,
};