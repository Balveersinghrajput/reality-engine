const router = require('express').Router();
const auth   = require('../middlewares/authInternal.middleware');
const { generalLimiter } = require('../middlewares/rateLimiter.middleware');
const ctrl   = require('../controllers/ai.controller');

router.use(auth);
router.use(generalLimiter);
router.post('/chat',           ctrl.chat);
router.post('/performance',    ctrl.analyzePerformance);
router.post('/study-plan',     ctrl.getStudyPlan);
router.post('/predict',        ctrl.predict);
router.get ('/weekly-summary', ctrl.weeklySummary);

module.exports = router;