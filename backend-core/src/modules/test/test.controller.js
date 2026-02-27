const testService = require('./test.service');
const { submitTestSchema } = require('./test.validation');
const { successResponse, errorResponse } = require('../../utils/response.helper');

async function generateTestController(req, res, next) {
  try {
    const test = await testService.generateTest(req.user.id, req.params.taskId);
    return successResponse(res, test, 'Test generated');
  } catch (err) { next(err); }
}

async function submitTestController(req, res, next) {
  try {
    const data = submitTestSchema.parse(req.body);
    const result = await testService.submitTest(req.user.id, data);
    return successResponse(res, result, 'Test submitted');
  } catch (err) {
    if (err.errors) return errorResponse(res, err.errors[0].message, 422);
    next(err);
  }
}

async function getTestHistoryController(req, res, next) {
  try {
    const history = await testService.getTestHistory(req.user.id);
    return successResponse(res, history, 'Test history fetched');
  } catch (err) { next(err); }
}

async function getTestResultController(req, res, next) {
  try {
    const result = await testService.getTestResult(req.user.id, req.params.id);
    return successResponse(res, result, 'Test result fetched');
  } catch (err) { next(err); }
}

module.exports = {
  generateTestController,
  submitTestController,
  getTestHistoryController,
  getTestResultController,
};