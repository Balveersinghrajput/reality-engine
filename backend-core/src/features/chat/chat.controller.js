// src/features/chat/chat.controller.js
const chatService = require('./chat.service');

const ok  = (res, data, msg = 'OK', status = 200) =>
  res.status(status).json({ success: true, message: msg, data });
const err = (res, msg, status = 400) =>
  res.status(status).json({ success: false, message: msg });

async function getOrCreateConversation(req, res, next) {
  try {
    const result = await chatService.getOrCreateConversation(req.user.id, req.params.userId);
    ok(res, result, 'Conversation ready');
  } catch (e) { next(e); }
}

async function getConversations(req, res, next) {
  try {
    const result = await chatService.getConversations(req.user.id);
    ok(res, result, 'Conversations fetched');
  } catch (e) { next(e); }
}

async function getMessages(req, res, next) {
  try {
    const result = await chatService.getMessages(
      req.params.conversationId, req.user.id, req.query.cursor
    );
    ok(res, result, 'Messages fetched');
  } catch (e) { next(e); }
}

async function sendMessage(req, res, next) {
  try {
    const { content } = req.body;
    if (!content?.trim()) return err(res, 'Message cannot be empty');
    const result = await chatService.sendMessage(req.params.conversationId, req.user.id, { content });
    ok(res, result, 'Sent', 201);
  } catch (e) { next(e); }
}

async function sendCodeMessage(req, res, next) {
  try {
    const { code, language, caption } = req.body;
    if (!code?.trim()) return err(res, 'Code cannot be empty');
    const result = await chatService.sendCodeMessage(
      req.params.conversationId, req.user.id, { code, language, caption }
    );
    ok(res, result, 'Code shared', 201);
  } catch (e) { next(e); }
}

async function sendMedia(req, res, next) {
  try {
    if (!req.file) return err(res, 'No file uploaded');
    const mime = req.file.mimetype;
    const type = mime.startsWith('image/') ? 'image'
               : mime.startsWith('video/') ? 'video'
               : 'file';
    const result = await chatService.sendMediaMessage(
      req.params.conversationId, req.user.id, {
        fileUrl:  req.file.path,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: mime,
        type,
        caption:  req.body.caption || '',
      }
    );
    ok(res, result, 'Media sent', 201);
  } catch (e) { next(e); }
}

async function deleteMessage(req, res, next) {
  try {
    const result = await chatService.deleteMessage(req.params.messageId, req.user.id);
    ok(res, result, 'Deleted');
  } catch (e) { next(e); }
}

async function deleteMessages(req, res, next) {
  try {
    const { messageIds } = req.body;
    if (!Array.isArray(messageIds) || !messageIds.length) return err(res, 'No IDs provided');
    const result = await chatService.deleteMessages(messageIds, req.user.id);
    ok(res, result, 'Deleted');
  } catch (e) { next(e); }
}

async function clearConversation(req, res, next) {
  try {
    const result = await chatService.clearConversation(req.params.conversationId, req.user.id);
    ok(res, result, 'Cleared');
  } catch (e) { next(e); }
}

module.exports = {
  getOrCreateConversation,
  getConversations,
  getMessages,
  sendMessage,
  sendCodeMessage,
  sendMedia,
  deleteMessage,
  deleteMessages,
  clearConversation,
};