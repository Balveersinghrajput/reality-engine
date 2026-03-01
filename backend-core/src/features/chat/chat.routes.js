// src/features/chat/chat.routes.js
const express = require('express');
const router  = express.Router();
const { authMiddleware } = require('../../middlewares/auth.middleware');
const { uploadImage, uploadVideo, uploadFile } = require('../../utils/cloudinary');
const ctrl = require('./chat.controller');

router.use(authMiddleware);

// ── Conversations ─────────────────────────────
router.get( '/conversations',          ctrl.getConversations);
router.post('/conversations/:userId',  ctrl.getOrCreateConversation); // open chat with a user

// ── Messages ──────────────────────────────────
router.get( '/conversations/:conversationId/messages', ctrl.getMessages);
router.post('/conversations/:conversationId/messages', ctrl.sendMessage);
router.post('/conversations/:conversationId/code',     ctrl.sendCodeMessage);

// ── Media uploads ─────────────────────────────
router.post('/conversations/:conversationId/image', uploadImage.single('file'), ctrl.sendMedia);
router.post('/conversations/:conversationId/video', uploadVideo.single('file'), ctrl.sendMedia);
router.post('/conversations/:conversationId/file',  uploadFile.single('file'),  ctrl.sendMedia);

// ── Delete ────────────────────────────────────
router.delete('/messages/:messageId',                 ctrl.deleteMessage);
router.post(  '/messages/delete-many',                ctrl.deleteMessages);
router.delete('/conversations/:conversationId/clear', ctrl.clearConversation);

module.exports = router;