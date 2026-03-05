const { chatWithPreset }                                                      = require('../services/openai.service');
const { buildSystemPrompt }                                                   = require('../services/contextBuilder.service');
const { generateWeeklySummary, identifyWeakAreas, predictProgress, getStudyRecommendations } = require('../services/performanceAnalyzer.service');

async function chat(req, res, next) {
  try {
    const { messages, system, topic } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) return res.status(400).json({ success: false, message: 'messages array required' });
    const sys = system || buildSystemPrompt('mentor', req.user, topic ? 'Topic: ' + topic : '');
    const reply = await chatWithPreset('mentor', sys, messages.slice(-12));
    res.json({ success: true, reply });
  } catch (err) { next(err); }
}

async function analyzePerformance(req, res, next) {
  try {
    const { stats, testHistory } = req.body;
    if (!stats) return res.status(400).json({ success: false, message: 'stats required' });
    const [summary, weakAreas] = await Promise.all([
      generateWeeklySummary(req.user, stats.weekStats || stats),
      testHistory?.length >= 3 ? identifyWeakAreas(req.user, testHistory) : Promise.resolve(null),
    ]);
    res.json({ success: true, summary, weakAreas });
  } catch (err) { next(err); }
}

async function getStudyPlan(req, res, next) {
  try {
    const { topic, daysUntilTest, currentScore, targetScore } = req.body;
    if (!topic) return res.status(400).json({ success: false, message: 'topic required' });
    const plan = await getStudyRecommendations(req.user, { topic, daysUntilTest: daysUntilTest||7, currentScore: currentScore||50, targetScore: targetScore||80 });
    res.json({ success: true, plan });
  } catch (err) { next(err); }
}

async function predict(req, res, next) {
  try {
    const { stats, weeks } = req.body;
    if (!stats) return res.status(400).json({ success: false, message: 'stats required' });
    const prediction = await predictProgress(req.user, stats, weeks || 4);
    res.json({ success: true, prediction });
  } catch (err) { next(err); }
}

async function weeklySummary(req, res, next) {
  try {
    const stats = {
      testsThisWeek:    [],
      tasksCompleted:   parseInt(req.query.tasksCompleted  || '0', 10),
      avgScoreThisWeek: parseInt(req.query.avgThisWeek     || '0', 10),
      avgScoreLastWeek: parseInt(req.query.avgLastWeek     || '0', 10),
      streak:           parseInt(req.query.streak          || '0', 10),
      topicsStudied:    req.query.topics?.split(',').filter(Boolean) || [],
    };
    const summary = await generateWeeklySummary(req.user, stats);
    res.json({ success: true, summary });
  } catch (err) { next(err); }
}

module.exports = { chat, analyzePerformance, getStudyPlan, predict, weeklySummary };