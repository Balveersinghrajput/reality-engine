const { chatWithPreset, chatJSON } = require('./openai.service');
const { buildSystemPrompt, buildPerfContext } = require('./contextBuilder.service');

async function generateWeeklySummary(user, weekStats) {
  const { testsThisWeek = [], tasksCompleted = 0, avgScoreThisWeek = 0, avgScoreLastWeek = 0, streak = 0, topicsStudied = [] } = weekStats;
  const sys = buildSystemPrompt('performance', user, 'Respond with JSON:\n{"headline":"one-line summary","trend":"improving|stable|declining","highlights":[],"concerns":[],"nextWeekFocus":"..."}');
  const trend = avgScoreThisWeek - avgScoreLastWeek;
  const prompt = 'Week: ' + testsThisWeek.length + ' tests (avg ' + avgScoreThisWeek + '%, ' + (trend>=0?'+':'') + trend.toFixed(1) + '% vs last week) | ' + tasksCompleted + ' tasks | ' + streak + 'd streak | Topics: ' + (topicsStudied.join(', ') || 'none');
  try { return await chatJSON(sys, [{ role: 'user', content: prompt }]); }
  catch { return { headline: 'Week complete', trend: 'stable', highlights: [], concerns: [], nextWeekFocus: 'Keep going.' }; }
}

async function identifyWeakAreas(user, testHistory) {
  if (!testHistory || testHistory.length < 3) return { weakAreas: [], strongAreas: [], recommendation: 'Take more tests to identify weak areas.' };
  const topicMap = {};
  for (const t of testHistory) { const k = t.topic || 'General'; if (!topicMap[k]) topicMap[k] = []; topicMap[k].push(t.score); }
  const stats = Object.entries(topicMap).map(([topic, scores]) => ({ topic, avg: Math.round(scores.reduce((a,b)=>a+b,0)/scores.length), count: scores.length })).sort((a,b)=>a.avg-b.avg);
  const sys = buildSystemPrompt('performance', user, 'Respond with JSON:\n{"weakAreas":[{"topic":"","avg":0,"advice":""}],"strongAreas":[{"topic":"","avg":0}],"recommendation":""}');
  const prompt = 'Topic scores:\n' + stats.map(t => t.topic + ': ' + t.avg + '% (' + t.count + ' tests)').join('\n');
  try { return await chatJSON(sys, [{ role: 'user', content: prompt }]); }
  catch { return { weakAreas: stats.slice(0,3).map(t=>({topic:t.topic,avg:t.avg,advice:'Review '+t.topic+' fundamentals.'})), strongAreas: stats.slice(-2).reverse().map(t=>({topic:t.topic,avg:t.avg})), recommendation: stats[0] ? 'Focus on ' + stats[0].topic : 'Take more tests.' }; }
}

async function predictProgress(user, stats, weeks = 4) {
  const sys = buildSystemPrompt('performance', user);
  const prompt = 'Predict status in ' + weeks + ' weeks:\nCurrent: ' + stats.mastery + '% mastery | ' + stats.streak + 'd streak | ' + stats.avgTestScore + '% avg\nWeekly: ~' + (stats.weeklyTests||2) + ' tests | ~' + (stats.weeklyTasks||5) + ' tasks\nTrend: ' + (stats.trend||'stable') + '\n\n2-sentence realistic prediction with numbers.';
  return chatWithPreset('analyst', sys, [{ role: 'user', content: prompt }]);
}

async function getStudyRecommendations(user, { topic, daysUntilTest, currentScore, targetScore }) {
  const sys = buildSystemPrompt('mentor', user);
  const prompt = 'Study plan for: ' + topic + '\nCurrent: ' + currentScore + '% | Target: ' + targetScore + '% | Days: ' + daysUntilTest + '\nLevel: ' + user.level + ' | Track: ' + user.track + '\n\nCreate a ' + daysUntilTest + '-day numbered plan. Be specific — name resources and practice problems.';
  return chatWithPreset('analyst', sys, [{ role: 'user', content: prompt }]);
}

module.exports = { generateWeeklySummary, identifyWeakAreas, predictProgress, getStudyRecommendations };