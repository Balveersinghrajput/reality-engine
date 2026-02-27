const groupsService = require('./groups.service');
const { createGroupSchema, sendMessageSchema } = require('./groups.validation');
const { successResponse, errorResponse } = require('../../utils/response.helper');

async function getMyGroupController(req, res, next) {
  try {
    const data = await groupsService.getMyGroup(req.user.id);
    return successResponse(res, data, 'Group fetched');
  } catch (err) { next(err); }
}

async function createGroupController(req, res, next) {
  try {
    const data = createGroupSchema.parse(req.body);
    const group = await groupsService.createGroup(req.user.id, data);
    return successResponse(res, group, 'Group created', 201);
  } catch (err) {
    if (err.errors) return errorResponse(res, err.errors[0].message, 422);
    next(err);
  }
}

async function inviteController(req, res, next) {
  try {
    const data = await groupsService.inviteToGroup(req.user.id, req.params.userId);
    return successResponse(res, data, 'Member invited');
  } catch (err) { next(err); }
}

async function getGroupMessagesController(req, res, next) {
  try {
    const { channel } = req.query;
    const data = await groupsService.getGroupMessages(
      req.user.id, req.params.groupId, channel
    );
    return successResponse(res, data, 'Messages fetched');
  } catch (err) { next(err); }
}

async function sendGroupMessageController(req, res, next) {
  try {
    const { content, channel } = sendMessageSchema.parse(req.body);
    const data = await groupsService.sendGroupMessage(
      req.user.id, req.params.groupId, content, channel
    );
    return successResponse(res, data, 'Message sent', 201);
  } catch (err) {
    if (err.errors) return errorResponse(res, err.errors[0].message, 422);
    next(err);
  }
}

async function getBatchMessagesController(req, res, next) {
  try {
    const { channel } = req.query;
    const data = await groupsService.getBatchMessages(req.user.id, channel);
    return successResponse(res, data, 'Batch messages fetched');
  } catch (err) { next(err); }
}

async function sendBatchMessageController(req, res, next) {
  try {
    const { content, channel } = sendMessageSchema.parse(req.body);
    const data = await groupsService.sendBatchMessage(req.user.id, content, channel);
    return successResponse(res, data, 'Message sent', 201);
  } catch (err) {
    if (err.errors) return errorResponse(res, err.errors[0].message, 422);
    next(err);
  }
}

module.exports = {
  getMyGroupController,
  createGroupController,
  inviteController,
  getGroupMessagesController,
  sendGroupMessageController,
  getBatchMessagesController,
  sendBatchMessageController,
};