const express = require('express');
const router = express.Router();
const {
  getDashboardController,
  getProfileController,
  getPublicProfileController,
  updateProfileController,
  searchUsersController,
  compareUsersController,
} = require('./user.controller');
const { authMiddleware } = require('../../middlewares/auth.middleware');

// All routes require auth
router.use(authMiddleware);

router.get('/dashboard', getDashboardController);
router.get('/profile', getProfileController);
router.get('/search', searchUsersController);
router.patch('/profile', updateProfileController);
router.get('/compare/:userId', compareUsersController);
router.get('/:username/public', getPublicProfileController);

module.exports = router;