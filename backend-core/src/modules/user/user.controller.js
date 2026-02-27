const userService = require('./user.service');
const { updateProfileSchema, searchSchema } = require('./user.validation');
const { successResponse, errorResponse } = require('../../utils/response.helper');

async function getDashboardController(req, res, next) {
  try {
    const data = await userService.getDashboard(req.user.id);
    return successResponse(res, data, 'Dashboard fetched');
  } catch (err) { next(err); }
}

async function getProfileController(req, res, next) {
  try {
    const data = await userService.getProfile(req.user.id);
    return successResponse(res, data, 'Profile fetched');
  } catch (err) { next(err); }
}

async function getPublicProfileController(req, res, next) {
  try {
    const data = await userService.getPublicProfile(req.params.username);
    return successResponse(res, data, 'Public profile fetched');
  } catch (err) { next(err); }
}

async function updateProfileController(req, res, next) {
  try {
    const data = updateProfileSchema.parse(req.body);
    const updated = await userService.updateProfile(req.user.id, data);
    return successResponse(res, updated, 'Profile updated');
  } catch (err) {
    if (err.errors) return errorResponse(res, err.errors[0].message, 422);
    next(err);
  }
}

async function searchUsersController(req, res, next) {
  try {
    const { query } = searchSchema.parse(req.query);
    const users = await userService.searchUsers(query, req.user.id);
    return successResponse(res, users, 'Search results');
  } catch (err) {
    if (err.errors) return errorResponse(res, err.errors[0].message, 422);
    next(err);
  }
}

async function compareUsersController(req, res, next) {
  try {
    const data = await userService.compareUsers(req.user.id, req.params.userId);
    return successResponse(res, data, 'Comparison fetched');
  } catch (err) { next(err); }
}

module.exports = {
  getDashboardController,
  getProfileController,
  getPublicProfileController,
  updateProfileController,
  searchUsersController,
  compareUsersController,
};