const { generateRoadmap, generateWeeklyFocus, getResourceRecommendations, getPrerequisites } = require('../services/roadmapGenerator.service');

async function generate(req, res, next) {
  try {
    const { targetRole, hoursPerWeek, targetWeeks, weakTopics, currentPhase } = req.body;
    const roadmap = await generateRoadmap(req.user, {
      targetRole:   targetRole   || (req.user.track + ' Developer'),
      hoursPerWeek: Number(hoursPerWeek || 10),
      targetWeeks:  Number(targetWeeks  || 8),
      weakTopics:   Array.isArray(weakTopics) ? weakTopics : [],
      currentPhase: currentPhase || 'Foundations',
    });
    res.json({ success: true, roadmap });
  } catch (err) { next(err); }
}

async function weekly(req, res, next) {
  try {
    res.json({ success: true, plan: await generateWeeklyFocus(req.user, req.body.stats || {}, req.body.currentPhase || 'Foundations') });
  } catch (err) { next(err); }
}

async function resources(req, res, next) {
  try {
    if (!req.query.topic) return res.status(400).json({ success: false, message: 'topic query param required' });
    res.json({ success: true, recommendations: await getResourceRecommendations(req.user, req.query.topic) });
  } catch (err) { next(err); }
}

async function prerequisites(req, res, next) {
  try {
    if (!req.query.topic) return res.status(400).json({ success: false, message: 'topic query param required' });
    res.json({ success: true, result: await getPrerequisites(req.user, req.query.topic) });
  } catch (err) { next(err); }
}

module.exports = { generate, weekly, resources, prerequisites };