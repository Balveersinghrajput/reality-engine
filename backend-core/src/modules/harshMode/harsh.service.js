const { prisma } = require('../../core/database/prismaClient');
const { getCache, setCache } = require('../../core/cache/cacheManager');
const { createNotification } = require('../notifications/notifications.service');

// ── Harsh Mode Messages ───────────────────────
const harshMessages = {
  stagnation: [
    "You haven't completed a task in 3 days. Industry doesn't wait for slow developers.",
    "3 days of no progress. At this rate you'll be job hunting for years.",
    "Stagnation detected. Your batch is moving forward without you.",
  ],
  low_score: [
    "Your test score is below 60%. That's failing in any real interview.",
    "Below average performance. Companies reject candidates like this daily.",
    "Your peers are scoring 80%+. You're falling behind fast.",
  ],
  rank_drop: [
    "You dropped 5 ranks this week. Your competitors are outworking you.",
    "Rank dropped. Someone in your batch just overtook you while you were idle.",
    "Falling in rankings. This is what happens when you don't stay consistent.",
  ],
  slow_speed: [
    "You're taking 3x longer than average on tasks. Speed matters in real jobs.",
    "Slow completion rate detected. Deadlines won't wait for you.",
    "Your task completion speed is in the bottom 30% of your batch.",
  ],
  missed_streak: [
    "Streak broken. Consistency is what separates hired developers from rejected ones.",
    "You broke your streak. Every day off is a day your competitors are ahead.",
    "No activity today. Your streak is gone. Start rebuilding now.",
  ],
};

function getHarshMessage(triggerType) {
  const messages = harshMessages[triggerType] || harshMessages.stagnation;
  return messages[Math.floor(Math.random() * messages.length)];
}

// ── Check And Trigger Harsh Mode ──────────────
async function checkHarshTriggers(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      mode: true,
      streakCurrent: true,
      masteryPercent: true,
      batchMember: { select: { rank: true, performanceScore: true } },
      tasks: {
        where: { status: 'completed' },
        orderBy: { completedAt: 'desc' },
        take: 1,
        select: { completedAt: true },
      },
      testResults: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { score: true },
      },
    },
  });

  if (!user || user.mode !== 'harsh') return [];

  const triggers = [];
  const now = new Date();

  // Check stagnation — no task completed in 3 days
  if (user.tasks.length > 0) {
    const lastCompleted = new Date(user.tasks[0].completedAt);
    const daysSince = Math.floor((now - lastCompleted) / (1000 * 60 * 60 * 24));
    if (daysSince >= 3) {
      triggers.push({ type: 'stagnation', severity: 'high' });
    }
  }

  // Check low test scores
  if (user.testResults.length >= 3) {
    const avg = user.testResults.reduce((s, t) => s + t.score, 0) / user.testResults.length;
    if (avg < 60) {
      triggers.push({ type: 'low_score', severity: 'high' });
    }
  }

  // Check streak broken
  if (user.streakCurrent === 0) {
    triggers.push({ type: 'missed_streak', severity: 'medium' });
  }

  // Check rank drop
  if (user.batchMember?.performanceScore < 30) {
    triggers.push({ type: 'slow_speed', severity: 'medium' });
  }

  // Log and notify for each trigger
  const logs = [];
  for (const trigger of triggers) {
    const message = getHarshMessage(trigger.type);

    const log = await prisma.harshLog.create({
      data: {
        userId,
        triggerType: trigger.type,
        message,
        severity: trigger.severity,
      },
    });

    await createNotification({
      userId,
      type: 'harsh',
      title: '⚠️ Reality Check',
      message,
    });

    logs.push(log);
  }

  return logs;
}

// ── Get Harsh Logs ────────────────────────────
async function getHarshLogs(userId) {
  const cacheKey = `harsh_logs:${userId}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const logs = await prisma.harshLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  await setCache(cacheKey, logs, 120);
  return logs;
}

// ── Get Harsh Stats ───────────────────────────
async function getHarshStats(userId) {
  const [logs, user] = await Promise.all([
    prisma.harshLog.findMany({
      where: { userId },
      select: { triggerType: true, severity: true, createdAt: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        mode: true,
        streakCurrent: true,
        masteryPercent: true,
        batchMember: { select: { performanceScore: true, rank: true } },
      },
    }),
  ]);

  const triggerCounts = {};
  logs.forEach(l => {
    triggerCounts[l.triggerType] = (triggerCounts[l.triggerType] || 0) + 1;
  });

  const highSeverity = logs.filter(l => l.severity === 'high').length;
  const recentLogs = logs.filter(l => {
    const diff = new Date() - new Date(l.createdAt);
    return diff < 7 * 24 * 60 * 60 * 1000;
  }).length;

  return {
    totalTriggers: logs.length,
    highSeverityTriggers: highSeverity,
    triggersThisWeek: recentLogs,
    triggerBreakdown: triggerCounts,
    currentMode: user?.mode,
    streakCurrent: user?.streakCurrent,
    masteryPercent: user?.masteryPercent,
    performanceScore: user?.batchMember?.performanceScore || 0,
    batchRank: user?.batchMember?.rank || 0,
    harshLevel: highSeverity > 5 ? 'extreme' : highSeverity > 2 ? 'high' : 'normal',
  };
}

// ── Toggle Harsh Mode ─────────────────────────
async function toggleHarshMode(userId, mode) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { mode },
    select: { id: true, username: true, mode: true },
  });

  if (mode === 'harsh') {
    await createNotification({
      userId,
      type: 'harsh',
      title: '🔥 Harsh Mode Activated',
      message: 'No more excuses. The system will now hold you accountable for every missed day.',
    });
  }

  return updated;
}

module.exports = {
  checkHarshTriggers,
  getHarshLogs,
  getHarshStats,
  toggleHarshMode,
};