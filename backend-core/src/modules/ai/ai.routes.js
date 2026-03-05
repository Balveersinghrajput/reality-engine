/**
 * backend-core/src/modules/ai/ai.routes.js
 *
 * Routes directly to local ai.controller.js + ai.service.js
 * No proxy to external ai-service needed — all logic lives in this backend.
 */

const express = require('express')
const router  = express.Router()
const { authMiddleware } = require('../../middlewares/auth.middleware')
const {
  chatController,
  generateTasksController,
  reviewCodeController,
  getInteractionHistoryController,
} = require('./ai.controller')

router.use(authMiddleware)

// ── Core AI features (fully implemented in ai.service.js) ─────────
router.post('/chat',           chatController)
router.post('/generate-tasks', generateTasksController)
router.post('/code-review',    reviewCodeController)
router.get ('/history',        getInteractionHistoryController)

// ── Stub routes used by dashboard / harsh / roadmap pages ─────────
// Returns graceful empty responses instead of 503/404
router.post('/performance',            stubOk)
router.post('/study-plan',             stubOk)
router.post('/predict',                stubOk)
router.get ('/weekly-summary',         stubWeeklySummary)
router.post('/harsh/analyze',          stubHarsh)
router.post('/harsh/test-verdict',     stubHarsh)
router.post('/harsh/compare',          stubHarsh)
router.post('/harsh/wake-up',          stubHarsh)
router.post('/roadmap/generate',       stubOk)
router.post('/roadmap/weekly',         stubOk)
router.get ('/roadmap/resources',      stubOk)
router.get ('/roadmap/prerequisites',  stubOk)

// ── Stub helpers ──────────────────────────────────────────────────
function stubOk(req, res) {
  res.json({ success: true, data: null, message: 'Feature coming soon' })
}

function stubWeeklySummary(req, res) {
  res.json({
    success: true,
    data: {
      summary: 'Complete more tasks to unlock your weekly summary.',
      trend:   'neutral',
    },
  })
}

function stubHarsh(req, res) {
  res.json({
    success: true,
    data: {
      grade:     'N/A',
      verdict:   'Complete tasks and tests first to get your brutal reality check.',
      strengths:  [],
      weaknesses: [],
      action:     'Start with the tasks section.',
    },
  })
}

module.exports = router