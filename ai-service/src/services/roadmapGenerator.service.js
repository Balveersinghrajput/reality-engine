const { chatJSON, chatWithPreset } = require('./openai.service');
const { buildSystemPrompt, buildPerfContext } = require('./contextBuilder.service');

async function generateRoadmap(user, { targetRole, hoursPerWeek = 10, targetWeeks = 8, weakTopics = [], currentPhase = 'Foundations' }) {
  const sys = buildSystemPrompt('roadmap', user,
    'Generate a ' + targetWeeks + '-week roadmap as JSON:\n{"title":"","goal":"","phases":[{"week":1,"phase":"","focus":"","topics":[],"dailyTasks":[],"milestone":"","resources":[],"hoursNeeded":0}],"finalProject":"","jobReadiness":""}'
  );
  const prompt = 'Roadmap for: ' + (targetRole || user.track + ' Developer') + '\nLevel: ' + user.level + ' | Phase: ' + currentPhase + ' | ' + hoursPerWeek + 'h/week for ' + targetWeeks + ' weeks' + (weakTopics.length ? '\nWeak areas: ' + weakTopics.join(', ') : '') + '\n\nMake it SPECIFIC and PROGRESSIVE.';
  return chatJSON(sys, [{ role: 'user', content: prompt }], { maxTokens: 3000, temperature: 0.4 });
}

async function generateWeeklyFocus(user, stats, currentPhase) {
  const sys = buildSystemPrompt('roadmap', user, 'Respond with JSON:\n{"weekTheme":"","days":[{"day":1,"label":"Mon","focus":"","tasks":[],"timeEst":"1.5h"}],"weekGoal":""}');
  const prompt = 'Phase: ' + currentPhase + '\n' + buildPerfContext(stats) + '\n7-day plan for ' + user.level + ' ' + user.track + '.';
  try { return await chatJSON(sys, [{ role: 'user', content: prompt }], { maxTokens: 1500 }); }
  catch {
    return { weekTheme: currentPhase, days: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((l,i)=>({ day:i+1, label:l, focus:'Study '+currentPhase, tasks:['Complete learning tasks','Take a quiz'], timeEst:'1.5h' })), weekGoal: 'Progress through ' + currentPhase };
  }
}

async function getResourceRecommendations(user, topic) {
  const sys = buildSystemPrompt('mentor', user);
  const prompt = 'Recommend 5 resources for "' + topic + '" — Level: ' + user.level + ' | Track: ' + user.track + '\nFormat: 1. [FREE/PAID] Name — why good. Include 2+ free.';
  return chatWithPreset('analyst', sys, [{ role: 'user', content: prompt }]);
}

async function getPrerequisites(user, topic) {
  const sys = buildSystemPrompt('mentor', user, 'Respond with JSON:\n{"topic":"","prerequisites":[{"topic":"","importance":"required|recommended|optional","reason":""}],"estimatedPriorStudy":""}');
  return chatJSON(sys, [{ role: 'user', content: 'Prerequisites for: ' + topic }]);
}

module.exports = { generateRoadmap, generateWeeklyFocus, getResourceRecommendations, getPrerequisites };