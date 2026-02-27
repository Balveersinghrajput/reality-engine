const aiService = require('./ai.service');
const { successResponse, errorResponse } = require('../../utils/response.helper');

async function chatController(req, res, next) {
  try {
    const { message, contextType } = req.body;
    if (!message) return errorResponse(res, 'Message is required', 422);
    const data = await aiService.chat(req.user.id, message, contextType);
    return successResponse(res, data, 'AI response');
  } catch (err) { next(err); }
}

async function generateTasksController(req, res, next) {
  try {
    const tasks = await aiService.generateTasks(req.user.id);
    return successResponse(res, tasks, 'Tasks generated', 201);
  } catch (err) { next(err); }
}

async function reviewCodeController(req, res, next) {
  try {
    const { code, language, taskId } = req.body;
    if (!code || !language) {
      return errorResponse(res, 'Code and language are required', 422);
    }
    const review = await aiService.reviewCode(req.user.id, code, language, taskId);
    return successResponse(res, review, 'Code reviewed');
  } catch (err) { next(err); }
}

async function getInteractionHistoryController(req, res, next) {
  try {
    const history = await aiService.getInteractionHistory(req.user.id);
    return successResponse(res, history, 'History fetched');
  } catch (err) { next(err); }
}

module.exports = {
  chatController,
  generateTasksController,
  reviewCodeController,
  getInteractionHistoryController,
};