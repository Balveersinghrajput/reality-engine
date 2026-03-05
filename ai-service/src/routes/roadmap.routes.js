const router = require('express').Router();
const auth   = require('../middlewares/authInternal.middleware');
const { strictLimiter, generalLimiter } = require('../middlewares/rateLimiter.middleware');
const ctrl   = require('../controllers/roadmap.controller');

router.use(auth);
router.post('/generate',      strictLimiter,  ctrl.generate);
router.post('/weekly',        strictLimiter,  ctrl.weekly);
router.get ('/resources',     generalLimiter, ctrl.resources);
router.get ('/prerequisites', generalLimiter, ctrl.prerequisites);

module.exports = router;