const realityService = require('./reality.service');
const { successResponse } = require('../../utils/response.helper');

async function calculateController(req, res, next) {
  try {
    const score = await realityService.calculateRealityScore(req.user.id);
    return successResponse(res, score, 'Reality score calculated');
  } catch (err) { next(err); }
}

async function getScoreController(req, res, next) {
  try {
    const score = await realityService.getRealityScore(req.user.id);
    return successResponse(res, score, 'Reality score fetched');
  } catch (err) { next(err); }
}

async function getHistoryController(req, res, next) {
  try {
    const history = await realityService.getScoreHistory(req.user.id);
    return successResponse(res, history, 'Score history fetched');
  } catch (err) { next(err); }
}

module.exports = {
  calculateController,
  getScoreController,
  getHistoryController,
};