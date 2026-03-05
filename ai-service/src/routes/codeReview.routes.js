const router = require('express').Router();
const auth   = require('../middlewares/authInternal.middleware');
const { codeReviewLimiter } = require('../middlewares/rateLimiter.middleware');
const ctrl   = require('../controllers/codeReview.controller');

router.use(auth);
router.use(codeReviewLimiter);
router.post('/review',   ctrl.review);
router.post('/explain',  ctrl.explain);
router.post('/bugs',     ctrl.bugs);
router.post('/optimise', ctrl.optimise);

module.exports = router;