const testService = require('./test.service');
const { successResponse, errorResponse } = require('../../utils/response.helper');

// ─────────────────────────────────────────────────────────────────
// POST /api/tests/generate/:taskId
// Generates AI exam questions for the given task
// ─────────────────────────────────────────────────────────────────
async function generateTestController(req, res, next) {
  try {
    const { taskId } = req.params;
    if (!taskId) return errorResponse(res, 'taskId is required', 422);

    const data = await testService.generateTest(req.user.id, taskId);
    return successResponse(res, data, 'Test generated');
  } catch (err) {
    if (err.message?.includes('not found')) return errorResponse(res, err.message, 404);
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────
// POST /api/tests/submit
// Body: { taskId, answers:[{questionId,answer}], questions:[...], timeTaken }
// Grades answers, saves result, awards XP
// ─────────────────────────────────────────────────────────────────
async function submitTestController(req, res, next) {
  try {
    const { taskId, answers, questions, timeTaken } = req.body;

    if (!taskId)                   return errorResponse(res, 'taskId is required',    422);
    if (!Array.isArray(answers))   return errorResponse(res, 'answers must be array', 422);
    if (!Array.isArray(questions)) return errorResponse(res, 'questions are required',422);

    const result = await testService.submitTest(
      req.user.id,
      taskId,
      answers,
      questions,
      Number(timeTaken) || 0,
    );

    return successResponse(res, result, 'Test submitted');
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────
// GET /api/tests/history
// Returns last 50 test results for the user (newest first)
// ─────────────────────────────────────────────────────────────────
async function getTestHistoryController(req, res, next) {
  try {
    const history = await testService.getTestHistory(req.user.id);
    return successResponse(res, history, 'Test history fetched');
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────
// GET /api/tests/:id/result
// Returns a single test result by its DB id
// ─────────────────────────────────────────────────────────────────
async function getTestResultController(req, res, next) {
  try {
    const { id } = req.params;
    if (!id) return errorResponse(res, 'Result id is required', 422);

    const result = await testService.getTestResult(req.user.id, id);
    return successResponse(res, result, 'Test result fetched');
  } catch (err) {
    if (err.message?.includes('not found')) return errorResponse(res, err.message, 404);
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────
// GET /api/tests/leaderboard
// ?topic=React+Hooks  → filter by topic (optional)
// Returns top 50 users ranked by avg score on Test: challenges
// ─────────────────────────────────────────────────────────────────
async function getTestLeaderboardController(req, res, next) {
  try {
    const topic = req.query.topic ? String(req.query.topic) : null;
    const data  = await testService.getLeaderboard(req.user.id, topic);
    return successResponse(res, data, 'Leaderboard fetched');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  generateTestController,
  submitTestController,
  getTestHistoryController,
  getTestResultController,
  getTestLeaderboardController,
};