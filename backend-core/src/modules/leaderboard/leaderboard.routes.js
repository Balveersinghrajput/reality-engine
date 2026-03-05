/**
 * leaderboard.routes.js
 *
 * Supports BOTH formats the frontend uses:
 *
 * Query-param format (primary):
 *   GET /api/leaderboard?scope=global
 *   GET /api/leaderboard?scope=track&track=webdev
 *   GET /api/leaderboard?scope=batch&batch=BATCH01
 *
 * Path format (used by leaderboard page):
 *   GET /api/leaderboard/platform            → same as scope=global
 *   GET /api/leaderboard/track/:trackName    → same as scope=track
 *   GET /api/leaderboard/batch/:batchId      → same as scope=batch
 *   GET /api/leaderboard/my-rank             → current user's rank info
 */

const express = require('express')
const router  = express.Router()
const { authMiddleware } = require('../../middlewares/auth.middleware')
const { getLeaderboard, getMyRank } = require('./leaderboard.service')
const { successResponse } = require('../../utils/response.helper')

router.use(authMiddleware)

// ── my-rank ───────────────────────────────────────────────────────
router.get('/my-rank', async (req, res, next) => {
  try {
    const data = await getMyRank(req.user.id)
    return successResponse(res, data, 'Rank fetched')
  } catch (err) { next(err) }
})

// ── /platform → global ───────────────────────────────────────────
router.get('/platform', async (req, res, next) => {
  try {
    const data = await getLeaderboard(req.user.id, 'global')
    return successResponse(res, data, 'Platform leaderboard fetched')
  } catch (err) { next(err) }
})

// ── /track/:trackName ─────────────────────────────────────────────
router.get('/track/:trackName', async (req, res, next) => {
  try {
    const data = await getLeaderboard(req.user.id, 'track', { track: req.params.trackName })
    return successResponse(res, data, 'Track leaderboard fetched')
  } catch (err) { next(err) }
})

// ── /batch/:batchId ───────────────────────────────────────────────
router.get('/batch/:batchId', async (req, res, next) => {
  try {
    const data = await getLeaderboard(req.user.id, 'batch', { batch: req.params.batchId })
    return successResponse(res, data, 'Batch leaderboard fetched')
  } catch (err) { next(err) }
})

// ── Query-param format: ?scope=global|track|batch ─────────────────
router.get('/', async (req, res, next) => {
  try {
    const scope = ['global', 'track', 'batch'].includes(req.query.scope)
      ? req.query.scope
      : 'global'
    const opts = {
      track: req.query.track,
      batch: req.query.batch,
    }
    const data = await getLeaderboard(req.user.id, scope, opts)
    return successResponse(res, data, 'Leaderboard fetched')
  } catch (err) { next(err) }
})

module.exports = router