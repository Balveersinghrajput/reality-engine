const express = require('express');
const router  = express.Router();
const {
  generateTestController,
  submitTestController,
  getTestHistoryController,
  getTestResultController,
} = require('./test.controller');
const { authMiddleware } = require('../../middlewares/auth.middleware');

router.use(authMiddleware);

// ── named routes first (before /:id param) ────────────────────────
router.get  ('/history',        getTestHistoryController);   // GET  /api/tests/history
router.post ('/submit',         submitTestController);        // POST /api/tests/submit

// ── param routes last ─────────────────────────────────────────────
router.get  ('/generate/:taskId', generateTestController);   // GET  /api/tests/generate/:taskId
router.get  ('/:id/result',       getTestResultController);  // GET  /api/tests/:id/result

module.exports = router;