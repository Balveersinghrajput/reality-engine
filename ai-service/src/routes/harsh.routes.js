const router = require('express').Router();
const auth   = require('../middlewares/authInternal.middleware');
const { strictLimiter } = require('../middlewares/rateLimiter.middleware');
const ctrl   = require('../controllers/harsh.controller');

router.use(auth);
router.use(strictLimiter);
router.post('/analyze',      ctrl.analyze);
router.post('/test-verdict', ctrl.testVerdict);
router.post('/compare',      ctrl.compare);
router.post('/wake-up',      ctrl.wakeUp);

module.exports = router;