const taskService = require('./task.service');
const { reflectionSchema } = require('./task.validation');
const { successResponse, errorResponse } = require('../../utils/response.helper');

async function getTasksController(req, res, next) {
  try {
    const tasks = await taskService.getTasks(req.user.id);
    return successResponse(res, tasks, 'Tasks fetched');
  } catch (err) { next(err); }
}

async function getTaskController(req, res, next) {
  try {
    const task = await taskService.getTask(req.user.id, req.params.id);
    return successResponse(res, task, 'Task fetched');
  } catch (err) { next(err); }
}

async function getTodayTaskController(req, res, next) {
  try {
    const data = await taskService.getTodayTask(req.user.id);
    return successResponse(res, data, 'Today task fetched');
  } catch (err) { next(err); }
}

async function getTaskStatsController(req, res, next) {
  try {
    const stats = await taskService.getTaskStats(req.user.id);
    return successResponse(res, stats, 'Task stats fetched');
  } catch (err) { next(err); }
}

async function startTimerController(req, res, next) {
  try {
    const task = await taskService.startTimer(req.user.id, req.params.id);
    return successResponse(res, task, 'Timer started');
  } catch (err) { next(err); }
}

async function stopTimerController(req, res, next) {
  try {
    const data = await taskService.stopTimer(req.user.id, req.params.id);
    return successResponse(res, data, 'Timer stopped');
  } catch (err) { next(err); }
}

async function completeTaskController(req, res, next) {
  try {
    const task = await taskService.completeTask(req.user.id, req.params.id);
    return successResponse(res, task, 'Task completed');
  } catch (err) { next(err); }
}

async function saveReflectionController(req, res, next) {
  try {
    const data = reflectionSchema.parse(req.body);
    const reflection = await taskService.saveReflection(req.user.id, req.params.id, data);
    return successResponse(res, reflection, 'Reflection saved');
  } catch (err) {
    if (err.errors) return errorResponse(res, err.errors[0].message, 422);
    next(err);
  }
}

module.exports = {
  getTasksController,
  getTaskController,
  getTodayTaskController,
  getTaskStatsController,
  startTimerController,
  stopTimerController,
  completeTaskController,
  saveReflectionController,
};