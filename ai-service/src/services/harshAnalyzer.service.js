const { chatWithPreset } = require('./openai.service');
const { buildSystemPrompt, buildPerfContext } = require('./contextBuilder.service');
const { parseJSON } = require('../config/openai');

function gradeFromScore(s) {
  if (s >= 90) return 'S'; if (s >= 75) return 'A'; if (s >= 60) return 'B'; if (s >= 45) return 'C'; return 'F';
}

async function analyzePerformance(user, stats) {
  const sys = buildSystemPrompt('harsh', user,
    'Respond with JSON only:\n{"verdict":"2-3 sentence assessment","grade":"S|A|B|C|F","score":0,"strengths":[],"weaknesses":[],"action":"one thing to do TODAY","prediction":"3 months from now"}'
  );
  const raw = await chatWithPreset('harsh', sys, [{ role: 'user', content: 'Analyze:\n\n' + buildPerfContext(stats) }], { jsonMode: true, maxTokens: 800 });
  try { return parseJSON(raw); }
  catch { return { verdict: raw.slice(0, 300) || 'Analysis unavailable.', grade: gradeFromScore(stats.mastery || 0), score: stats.mastery || 0, strengths: [], weaknesses: ['Unable to parse analysis'], action: 'Complete more tests.', prediction: 'Unknown.' }; }
}

async function analyzeTestResult(user, testData) {
  const { topic, score, timeTaken = 0, totalQuestions = 10, correctAnswers, difficulty = 'medium' } = testData;
  const sys = buildSystemPrompt('harsh', user, 'Respond with JSON: {"verdict":"2 sentences","improvements":["...","...","..."],"verdict_grade":"S|A|B|C|F"}');
  const prompt = 'Test: ' + topic + ' | Score: ' + score + '% (' + (correctAnswers || Math.round(score/10)) + '/' + totalQuestions + ') | Difficulty: ' + difficulty + ' | Time: ' + Math.floor(timeTaken/60) + 'm ' + (timeTaken%60) + 's';
  const raw = await chatWithPreset('harsh', sys, [{ role: 'user', content: prompt }], { jsonMode: true, maxTokens: 400 });
  try { return parseJSON(raw); }
  catch { return { verdict: raw.slice(0, 200) || score + '% on ' + topic, improvements: ['Study topic', 'Review errors', 'Retake test'], verdict_grade: gradeFromScore(score) }; }
}

async function compareToAverages(user, userStats, benchmarks = {}) {
  const { avgPlatformScore = 65, avgPlatformStreak = 3, topPercentile = 85 } = benchmarks;
  const sys = buildSystemPrompt('harsh', user);
  const prompt = 'Student: ' + userStats.mastery + '% mastery | ' + userStats.streak + 'd streak | ' + userStats.avgTestScore + '% avg test\nPlatform avg: ' + avgPlatformScore + '% | ' + avgPlatformStreak + 'd streak\nTop 10%: ' + topPercentile + '%\nTell them where they stand in 3 sentences max.';
  return chatWithPreset('harsh', sys, [{ role: 'user', content: prompt }]);
}

async function generateWakeUpCall(user, daysSinceActive) {
  const sys = buildSystemPrompt('harsh', user);
  const prompt = 'Student inactive ' + daysSinceActive + ' days. Write a ' + (user.mode === 'harsh' ? 'brutal' : 'motivating') + ' 2-sentence wake-up. Reference what they are losing.';
  return chatWithPreset('harsh', sys, [{ role: 'user', content: prompt }]);
}

module.exports = { analyzePerformance, analyzeTestResult, compareToAverages, generateWakeUpCall };