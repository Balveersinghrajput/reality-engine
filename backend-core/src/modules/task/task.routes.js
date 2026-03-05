const express = require('express');
const router  = express.Router();
const {
  getTasksController,
  getTaskController,
  getTodayTaskController,
  getTaskStatsController,
  startTimerController,
  stopTimerController,
  completeTaskController,
  saveReflectionController,
  createTaskController,
  deleteTaskController,
  activateTaskController,
} = require('./task.controller');
const { authMiddleware } = require('../../middlewares/auth.middleware');
const { prisma }         = require('../../core/database/prismaClient');

// ── OpenAI SDK → Groq-compatible endpoint (matches your .env) ────────
const OpenAI = require('openai');
const openai  = new OpenAI({
  apiKey:  process.env.OPENAI_API_KEY,
  baseURL: (process.env.OPENAI_BASE_URL || 'https://api.groq.com/openai/v1').trim(),
});
const AI_MODEL = process.env.OPENAI_MODEL || 'llama-3.3-70b-versatile';

router.use(authMiddleware);

// ── POST /api/tasks/sigma ─────────────────────────────────────────────
// Generic AI proxy — used by dashboard task generation, SIGMA chat, test gen
router.post('/sigma', async (req, res) => {
  try {
    const { messages, system } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, reply: 'messages array required' });
    }

    const completion = await openai.chat.completions.create({
      model:      AI_MODEL,
      max_tokens: 1500,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        ...messages,
      ],
    });

    const reply = completion.choices?.[0]?.message?.content?.trim() ?? '';
    res.json({ success: true, reply });
  } catch (err) {
    console.error('[/tasks/sigma] error:', err.message);
    res.status(500).json({ success: false, reply: 'AI systems are temporarily unavailable. Try again in a moment.' });
  }
});

// ── Standard task routes ──────────────────────────────────────────────
router.get   ('/',      getTasksController);
router.get   ('/today', getTodayTaskController);
router.get   ('/stats', getTaskStatsController);
router.post  ('/',      createTaskController);

// ── POST /api/tasks/save-result ───────────────────────────────────────
router.post('/save-result', async (req, res) => {
  try {
    const userId = req.user.id;
    const { challengeTitle, score, xpEarned, timeTaken, estimatedMinutes, difficulty } = req.body;

    await prisma.taskResult.create({
      data: {
        userId,
        challengeTitle:   challengeTitle || 'SIGMA Challenge',
        score:            Number(score)           || 0,
        xpEarned:         Number(xpEarned)        || 0,
        timeTakenSeconds: Number(timeTaken)        || 0,
        estimatedMinutes: Number(estimatedMinutes) || 0,
        difficulty:       difficulty               || 'medium',
      },
    });

    if (Number(xpEarned) > 0) {
      await prisma.user.update({
        where: { id: userId },
        data:  { xp: { increment: Number(xpEarned) } },
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[save-result] error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/tasks/performance ────────────────────────────────────────
// ?range=all  → every day since first session
// (default)   → last 7 days
router.get('/performance', async (req, res) => {
  try {
    const userId  = req.user.id;
    const allTime = req.query.range === 'all';

    const where = allTime
      ? { userId }
      : { userId, completedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } };

    const results = await prisma.taskResult.findMany({
      where,
      orderBy: { completedAt: 'asc' },
    });

    const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const map  = {};

    for (const r of results) {
      const d   = new Date(r.completedAt);
      const key = d.toISOString().split('T')[0];
      const day = DAY[d.getDay()];
      if (!map[key]) map[key] = { day, date: key, score: 0, count: 0, xp: 0 };
      map[key].score += r.score;
      map[key].count += 1;
      map[key].xp    += r.xpEarned;
    }

    const data = Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({
        day:        v.day,
        date:       v.date,
        score:      Math.round(v.score / v.count),
        challenges: v.count,
        xp:         v.xp,
      }));

    res.json({ success: true, data });
  } catch (err) {
    console.error('[performance] error:', err.message);
    res.json({ success: true, data: [] });
  }
});

// ── GET /api/tasks/leaderboard ────────────────────────────────────────
// ?topic=React  → filter by test topic
router.get('/leaderboard', async (req, res) => {
  try {
    const userId      = req.user.id;
    const topicFilter = req.query.topic ? String(req.query.topic) : null;

    const titleWhere = topicFilter
      ? { challengeTitle: { startsWith: `Test: ${topicFilter}` } }
      : { challengeTitle: { startsWith: 'Test:' } };

    const raw = await prisma.taskResult.groupBy({
      by:      ['userId'],
      where:   titleWhere,
      _avg:    { score: true },
      _max:    { score: true },
      _count:  { id: true },
      _sum:    { xpEarned: true },
      orderBy: { _avg: { score: 'desc' } },
      take:    50,
    });

    const userIds = raw.map(r => r.userId);
    const users   = await prisma.user.findMany({
      where:  { id: { in: userIds } },
      select: { id: true, username: true, tier: true, level: true, targetTrack: true, streakCurrent: true },
    });
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    const myRank = raw.findIndex(r => r.userId === userId) + 1;

    const leaderboard = raw.map((r, i) => ({
      rank:          i + 1,
      userId:        r.userId,
      username:      userMap[r.userId]?.username    || 'Unknown',
      tier:          userMap[r.userId]?.tier        || 'developing',
      level:         userMap[r.userId]?.level       || 'beginner',
      avgScore:      Math.round(r._avg.score        ?? 0),
      bestScore:     r._max.score                   ?? 0,
      testCount:     r._count.id,
      totalXP:       r._sum.xpEarned                ?? 0,
      streak:        userMap[r.userId]?.streakCurrent ?? 0,
      isCurrentUser: r.userId === userId,
    }));

    // My topics for filter dropdown
    const topicRows = await prisma.taskResult.findMany({
      where:    { userId, challengeTitle: { startsWith: 'Test:' } },
      select:   { challengeTitle: true },
      distinct: ['challengeTitle'],
      orderBy:  { completedAt: 'desc' },
      take:     30,
    });
    const myTopics = topicRows
      .map(r => r.challengeTitle.replace(/^Test:\s*/, '').trim())
      .filter(Boolean);

    res.json({ success: true, leaderboard, myRank: myRank || null, myTopics, topic: topicFilter });
  } catch (err) {
    console.error('[leaderboard] error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Parameterised routes ──────────────────────────────────────────────
router.get   ('/:id',             getTaskController);
router.patch ('/:id/activate',    activateTaskController);
router.post  ('/:id/timer/start', startTimerController);
router.post  ('/:id/timer/stop',  stopTimerController);
router.post  ('/:id/complete',    completeTaskController);
router.post  ('/:id/reflection',  saveReflectionController);
router.delete('/:id',             deleteTaskController);

module.exports = router;