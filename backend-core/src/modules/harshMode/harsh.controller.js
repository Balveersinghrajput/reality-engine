const harshService = require('./harsh.service');
const { successResponse } = require('../../utils/response.helper');

async function checkTriggersController(req, res, next) {
  try {
    const logs = await harshService.checkHarshTriggers(req.user.id);
    return successResponse(res, logs, 'Harsh triggers checked');
  } catch (err) { next(err); }
}

async function getHarshLogsController(req, res, next) {
  try {
    const logs = await harshService.getHarshLogs(req.user.id);
    return successResponse(res, logs, 'Harsh logs fetched');
  } catch (err) { next(err); }
}

async function getHarshStatsController(req, res, next) {
  try {
    const stats = await harshService.getHarshStats(req.user.id);
    return successResponse(res, stats, 'Harsh stats fetched');
  } catch (err) { next(err); }
}

async function toggleModeController(req, res, next) {
  try {
    const { mode } = req.body;
    if (!['normal', 'competitive', 'harsh'].includes(mode)) {
      return res.status(422).json({ success: false, message: 'Invalid mode' });
    }
    const updated = await harshService.toggleHarshMode(req.user.id, mode);
    return successResponse(res, updated, `Mode changed to ${mode}`);
  } catch (err) { next(err); }
}

module.exports = {
  checkTriggersController,
  getHarshLogsController,
  getHarshStatsController,
  toggleModeController,
};