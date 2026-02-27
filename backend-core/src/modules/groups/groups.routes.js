const express = require('express');
const router = express.Router();
const {
  getMyGroupController,
  createGroupController,
  inviteController,
  getGroupMessagesController,
  sendGroupMessageController,
  getBatchMessagesController,
  sendBatchMessageController,
} = require('./groups.controller');
const { authMiddleware } = require('../../middlewares/auth.middleware');

router.use(authMiddleware);

// ⚠️ Batch routes MUST come before /:groupId routes
router.get('/batch/messages', getBatchMessagesController);
router.post('/batch/messages', sendBatchMessageController);

// Group routes
router.get('/my-group', getMyGroupController);
router.post('/create', createGroupController);
router.post('/invite/:userId', inviteController);
router.get('/:groupId/messages', getGroupMessagesController);
router.post('/:groupId/messages', sendGroupMessageController);

module.exports = router;