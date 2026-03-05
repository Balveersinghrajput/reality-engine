const aiService = require('./ai.service');
const { successResponse, errorResponse } = require('../../utils/response.helper');

// ── Chat ──────────────────────────────────────────────────────────
// Accepts both formats:
//   { message: "hi", contextType: "chat" }          ← from ai-chat page
//   { messages: [{role,content}], contextType }      ← from proxy (if used)
async function chatController(req, res, next) {
  try {
    // Support both { message } and { messages } formats
    let message = req.body.message || req.body.content || ''

    // If frontend sent messages array, extract the last user message
    if (!message && Array.isArray(req.body.messages)) {
      const userMsgs = req.body.messages.filter(m => m.role === 'user')
      message = userMsgs[userMsgs.length - 1]?.content || ''
    }

    if (!message) return errorResponse(res, 'Message is required', 422)

    const contextType = req.body.contextType || 'chat'
    const data = await aiService.chat(req.user.id, message, contextType)
    return successResponse(res, data, 'AI response')
  } catch (err) { next(err) }
}

// ── Generate Tasks ────────────────────────────────────────────────
async function generateTasksController(req, res, next) {
  try {
    const tasks = await aiService.generateTasks(req.user.id)
    return successResponse(res, tasks, 'Tasks generated', 201)
  } catch (err) { next(err) }
}

// ── Code Review ───────────────────────────────────────────────────
async function reviewCodeController(req, res, next) {
  try {
    const { code, language, taskId } = req.body
    if (!code || !language) {
      return errorResponse(res, 'Code and language are required', 422)
    }
    const review = await aiService.reviewCode(req.user.id, code, language, taskId)
    return successResponse(res, review, 'Code reviewed')
  } catch (err) { next(err) }
}

// ── Interaction History ───────────────────────────────────────────
async function getInteractionHistoryController(req, res, next) {
  try {
    const history = await aiService.getInteractionHistory(req.user.id)
    return successResponse(res, history, 'History fetched')
  } catch (err) { next(err) }
}

module.exports = {
  chatController,
  generateTasksController,
  reviewCodeController,
  getInteractionHistoryController,
}