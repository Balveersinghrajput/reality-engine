const express  = require('express');
const router   = express.Router();
const { authMiddleware } = require('../../middlewares/auth.middleware');
const userController = require('./user.controller');
const multer   = require('multer');

// ── multer instances ───────────────────────────────────────────────

const picUpload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed for profile pic'));
  },
});

const postUpload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Only images and videos allowed for posts'));
  },
});

const hlUpload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed for highlights'));
  },
});

router.use(authMiddleware);

// ── Own profile ────────────────────────────────────────────────────
router.get  ('/profile',          userController.getProfile);
router.patch('/profile',          userController.updateProfile);
router.patch('/profile-pic',      picUpload.single('profilePic'), userController.updateProfilePic);
router.get  ('/dashboard',        userController.getDashboard);

// ── Posts ──────────────────────────────────────────────────────────
router.post  ('/posts',              postUpload.single('media'), userController.createPost);
router.get   ('/posts',              userController.getMyPosts);
router.delete('/posts/:id',          userController.deletePost);
router.post  ('/posts/:id/like',     userController.likePost);
router.post  ('/posts/:id/bookmark', userController.bookmarkPost);
router.post  ('/posts/:id/comments', userController.addComment);
router.get   ('/posts/:id/comments', userController.getComments);

// ── Highlights ─────────────────────────────────────────────────────
router.post  ('/highlights',         hlUpload.single('image'), userController.createHighlight);
router.get   ('/highlights',         userController.getMyHighlights);
router.delete('/highlights/:id',     userController.deleteHighlight);

// ── Public profile routes (must be LAST to avoid catching above routes) ──
router.get('/:username/public',   userController.getPublicProfile);
router.get('/:username/friends',  userController.getUserFriends);  // ✅ NEW

module.exports = router;