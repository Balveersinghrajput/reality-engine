const { prisma } = require('../../core/database/prismaClient');
const { getCache, setCache, deleteCache } = require('../../core/cache/cacheManager');

// ── Calculate Reality Score ───────────────────
async function calculateRealityScore(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      targetTrack: true,
      level: true,
      streakCurrent: true,
      masteryPercent: true,
      batchMember: { select: { performanceScore: true, rank: true } },
      testResults: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { score: true, passed: true, timeTaken: true },
      },
      codeSubmissions: {
        orderBy: { submittedAt: 'desc' },
        take: 10,
        select: { passRate: true, timeTaken: true, status: true },
      },
      tasks: {
        select: { status: true, estimatedMinutes: true },
      },
    },
  });

  if (!user) throw { status: 404, message: 'User not found' };

  // ── Interview Score ─────────────────────────
  const testAvg = user.testResults.length > 0
    ? user.testResults.reduce((s, t) => s + t.score, 0) / user.testResults.length
    : 0;
  const passRate = user.testResults.length > 0
    ? (user.testResults.filter(t => t.passed).length / user.testResults.length) * 100
    : 0;
  const interviewScore = Math.round((testAvg * 0.6) + (passRate * 0.4));

  // ── Code Quality Score ──────────────────────
  const codeAvg = user.codeSubmissions.length > 0
    ? user.codeSubmissions.reduce((s, c) => s + c.passRate, 0) / user.codeSubmissions.length
    : 0;
  const codeQualityScore = Math.round(codeAvg);

  // ── Speed Score ─────────────────────────────
  const completedTasks = user.tasks.filter(t => t.status === 'completed');
  const speedScore = completedTasks.length > 0
    ? Math.min(Math.round((completedTasks.length / user.tasks.length) * 100), 100)
    : 0;

  // ── Consistency Score ───────────────────────
  const streakBonus = Math.min(user.streakCurrent * 2, 40);
  const consistencyScore = Math.min(
    Math.round((user.masteryPercent * 0.6) + streakBonus),
    100
  );

  // ── Overall Reality Score ───────────────────
  const score = Math.round(
    interviewScore * 0.30 +
    codeQualityScore * 0.25 +
    speedScore * 0.25 +
    consistencyScore * 0.20
  );

  // ── Industry Gap ────────────────────────────
  const industryStandards = {
    webdev: 75, cloud: 80, cyber: 85,
    ai: 85, devops: 80, fullstack: 75,
    system_design: 85, robotics: 90,
  };
  const standard = industryStandards[user.targetTrack] || 75;
  const industryGap = Math.max(0, standard - score);

  // Save to DB
  const realityScore = await prisma.realityScore.create({
    data: {
      userId,
      score,
      industryGap,
      interviewScore,
      codeQualityScore,
      speedScore,
      consistencyScore,
    },
  });

  // Update user reality score
  await prisma.user.update({
    where: { id: userId },
    data: { realityScore: score },
  });

  await deleteCache(`dashboard:${userId}`);
  return realityScore;
}

// ── Get Reality Score ─────────────────────────
async function getRealityScore(userId) {
  const cacheKey = `reality_score:${userId}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const scores = await prisma.realityScore.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: 10,
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      targetTrack: true,
      level: true,
      realityScore: true,
      masteryPercent: true,
      trackRank: true,
      platformRank: true,
    },
  });

  const latest = scores[0] || null;
  const industryStandards = {
    webdev: 75, cloud: 80, cyber: 85,
    ai: 85, devops: 80, fullstack: 75,
    system_design: 85, robotics: 90,
  };
  const standard = industryStandards[user?.targetTrack] || 75;

  const result = {
    latest,
    history: scores,
    user: {
      targetTrack: user?.targetTrack,
      level: user?.level,
      currentScore: user?.realityScore || 0,
      industryStandard: standard,
      gap: Math.max(0, standard - (user?.realityScore || 0)),
      masteryPercent: user?.masteryPercent,
      trackRank: user?.trackRank,
      platformRank: user?.platformRank,
    },
    readinessLevel: getReadinessLevel(user?.realityScore || 0),
    recommendations: getRecommendations(latest),
  };

  await setCache(cacheKey, result, 300);
  return result;
}

function getReadinessLevel(score) {
  if (score >= 85) return { level: 'Job Ready', emoji: '🚀', color: 'green' };
  if (score >= 70) return { level: 'Almost Ready', emoji: '⚡', color: 'blue' };
  if (score >= 55) return { level: 'Developing', emoji: '📈', color: 'yellow' };
  if (score >= 40) return { level: 'Needs Work', emoji: '⚠️', color: 'orange' };
  return { level: 'Critical', emoji: '❌', color: 'red' };
}

function getRecommendations(score) {
  if (!score) return ['Complete more tasks', 'Take tests regularly', 'Maintain daily streak'];
  const recs = [];
  if (score.interviewScore < 70) recs.push('Focus on test performance — aim for 70%+ scores');
  if (score.codeQualityScore < 60) recs.push('Practice more coding challenges');
  if (score.speedScore < 50) recs.push('Increase task completion speed');
  if (score.consistencyScore < 60) recs.push('Maintain daily streak for consistency score');
  if (recs.length === 0) recs.push('Great work! Keep maintaining your performance');
  return recs;
}

// ── Get Score History ─────────────────────────
async function getScoreHistory(userId) {
  const scores = await prisma.realityScore.findMany({
    where: { userId },
    orderBy: { updatedAt: 'asc' },
    select: {
      score: true,
      interviewScore: true,
      codeQualityScore: true,
      speedScore: true,
      consistencyScore: true,
      industryGap: true,
      updatedAt: true,
    },
  });
  return scores;
}

module.exports = {
  calculateRealityScore,
  getRealityScore,
  getScoreHistory,
};