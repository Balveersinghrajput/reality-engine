const userService = require('./user.service');
const { successResponse, errorResponse } = require('../../utils/response.helper');

// ── Own profile ────────────────────────────────────────────────────

async function getProfile(req, res, next) {
  try {
    const data = await userService.getProfile(req.user.id);
    return successResponse(res, data, 'Profile fetched');
  } catch (err) { next(err); }
}

async function updateProfile(req, res, next) {
  try {
    const { bio, githubUrl, linkedinUrl, portfolioUrl, skills } = req.body;
    const data = await userService.updateProfile(req.user.id, { bio, githubUrl, linkedinUrl, portfolioUrl, skills });
    return successResponse(res, data, 'Profile updated');
  } catch (err) { next(err); }
}

async function updateProfilePic(req, res, next) {
  try {
    if (!req.file) return errorResponse(res, 'No file uploaded', 422);
    const data = await userService.updateProfilePic(req.user.id, req.file);
    return successResponse(res, data, 'Profile picture updated');
  } catch (err) { next(err); }
}

async function getDashboard(req, res, next) {
  try {
    const data = await userService.getDashboard(req.user.id);
    return successResponse(res, data, 'Dashboard fetched');
  } catch (err) { next(err); }
}

// ── Public profile ─────────────────────────────────────────────────

async function getPublicProfile(req, res, next) {
  try {
    const { username } = req.params;
    const data = await userService.getPublicProfile(username, req.user.id);
    return successResponse(res, data, 'Public profile fetched');
  } catch (err) {
    if (err.message?.includes('not found')) return errorResponse(res, err.message, 404);
    next(err);
  }
}

// ✅ NEW: Get public friends list for a username
async function getUserFriends(req, res, next) {
  try {
    const { username } = req.params;
    const data = await userService.getUserFriends(username);
    return successResponse(res, data, 'Friends fetched');
  } catch (err) {
    if (err.message?.includes('not found')) return errorResponse(res, err.message, 404);
    next(err);
  }
}

// ── Posts ──────────────────────────────────────────────────────────

async function createPost(req, res, next) {
  try {
    const { content } = req.body;
    if (!content?.trim() && !req.file) return errorResponse(res, 'Post must have content or media', 422);
    const post = await userService.createPost(req.user.id, content?.trim() || '', req.file || null);
    return successResponse(res, post, 'Post created', 201);
  } catch (err) { next(err); }
}

async function getMyPosts(req, res, next) {
  try {
    const posts = await userService.getPosts(req.user.id, req.user.id);
    return successResponse(res, posts, 'Posts fetched');
  } catch (err) { next(err); }
}

async function deletePost(req, res, next) {
  try {
    await userService.deletePost(req.user.id, req.params.id);
    return successResponse(res, null, 'Post deleted');
  } catch (err) { next(err); }
}

async function likePost(req, res, next) {
  try {
    const result = await userService.likePost(req.user.id, req.params.id);
    return successResponse(res, result, 'Post liked');
  } catch (err) { next(err); }
}

async function addComment(req, res, next) {
  try {
    const { content } = req.body;
    if (!content?.trim()) return errorResponse(res, 'Comment content required', 422);
    const comment = await userService.addComment(req.user.id, req.params.id, content.trim());
    return successResponse(res, comment, 'Comment added', 201);
  } catch (err) { next(err); }
}

async function getComments(req, res, next) {
  try {
    const comments = await userService.getComments(req.params.id);
    return successResponse(res, comments, 'Comments fetched');
  } catch (err) { next(err); }
}

// ── Highlights ─────────────────────────────────────────────────────

async function createHighlight(req, res, next) {
  try {
    const { title, link, description } = req.body;
    if (!title || !link) return errorResponse(res, 'Title and link are required', 422);
    const hl = await userService.createHighlight(req.user.id, { title, link, description }, req.file);
    return successResponse(res, hl, 'Highlight created', 201);
  } catch (err) { next(err); }
}

async function getMyHighlights(req, res, next) {
  try {
    const hls = await userService.getHighlights(req.user.id);
    return successResponse(res, hls, 'Highlights fetched');
  } catch (err) { next(err); }
}

async function deleteHighlight(req, res, next) {
  try {
    await userService.deleteHighlight(req.user.id, req.params.id);
    return successResponse(res, null, 'Highlight deleted');
  } catch (err) { next(err); }
}

module.exports = {
  getProfile,
  updateProfile,
  updateProfilePic,
  getDashboard,
  getPublicProfile,
  getUserFriends,       // ✅ NEW
  createPost,
  getMyPosts,
  deletePost,
  likePost,
  addComment,
  getComments,
  createHighlight,
  getMyHighlights,
  deleteHighlight,
};
