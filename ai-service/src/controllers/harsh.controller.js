const { analyzePerformance, analyzeTestResult, compareToAverages, generateWakeUpCall } = require('../services/harshAnalyzer.service');

async function analyze(req, res, next) {
  try {
    if (!req.body.stats) return res.status(400).json({ success: false, message: 'stats required' });
    res.json({ success: true, analysis: await analyzePerformance(req.user, req.body.stats) });
  } catch (err) { next(err); }
}

async function testVerdict(req, res, next) {
  try {
    const { score } = req.body;
    if (score === undefined || score === null) return res.status(400).json({ success: false, message: 'score required' });
    res.json({ success: true, verdict: await analyzeTestResult(req.user, req.body) });
  } catch (err) { next(err); }
}

async function compare(req, res, next) {
  try {
    if (!req.body.userStats) return res.status(400).json({ success: false, message: 'userStats required' });
    res.json({ success: true, comparison: await compareToAverages(req.user, req.body.userStats, req.body.benchmarks || {}) });
  } catch (err) { next(err); }
}

async function wakeUp(req, res, next) {
  try {
    res.json({ success: true, message: await generateWakeUpCall(req.user, Number(req.body.daysSinceActive || 3)) });
  } catch (err) { next(err); }
}

module.exports = { analyze, testVerdict, compare, wakeUp };