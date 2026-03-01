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

router.use(authMiddleware);

// ── Helper: call Groq via OpenAI-compatible fetch (no SDK needed) ─
async function callGroq(messages) {
  const baseURL = process.env.OPENAI_BASE_URL || 'https://api.groq.com/openai/v1';
  const apiKey  = process.env.OPENAI_API_KEY;

  const res = await fetch(`${baseURL}/chat/completions`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model:       'llama-3.3-70b-versatile',
      max_tokens:  1000,
      temperature: 0.85,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq error: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// ── POST /api/tasks/sigma — SIGMA AI (called from tasks page) ────
router.post('/sigma', async (req, res) => {
  try {
    const { messages, system } = req.body;
    const reply = await callGroq([{ role: 'system', content: system }, ...messages]);
    res.json({ success: true, reply });
  } catch (err) {
    console.error('SIGMA error:', err.message);
    res.status(500).json({ success: false, reply: 'My systems are down. Try again.' });
  }
});

// ── Standard task routes ──────────────────────────────────────────
router.get   ('/',      getTasksController);
router.get   ('/today', getTodayTaskController);
router.get   ('/stats', getTaskStatsController);
router.post  ('/',      createTaskController);

// ── POST /api/tasks/save-result ───────────────────────────────────
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
    console.error('save-result error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/tasks/performance ────────────────────────────────────
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
    var map = {};

    for (var i = 0; i < results.length; i++) {
      var r   = results[i];
      var d   = new Date(r.completedAt);
      var key = d.toISOString().split('T')[0];
      var day = DAY[d.getDay()];
      if (!map[key]) map[key] = { day: day, date: key, score: 0, count: 0, xp: 0 };
      map[key].score += r.score;
      map[key].count += 1;
      map[key].xp    += r.xpEarned;
    }

    var data = Object.keys(map).sort().map(function(key) {
      var v = map[key];
      return {
        day:        v.day,
        date:       v.date,
        score:      Math.round(v.score / v.count),
        challenges: v.count,
        xp:         v.xp,
      };
    });

    res.json({ success: true, data: data });
  } catch (err) {
    console.error('performance error:', err);
    res.json({ success: true, data: [] });
  }
});

// ── Parameterised routes — MUST be last ──────────────────────────
router.get   ('/:id',             getTaskController);
router.patch ('/:id/activate',    activateTaskController);
router.post  ('/:id/timer/start', startTimerController);
router.post  ('/:id/timer/stop',  stopTimerController);
router.post  ('/:id/complete',    completeTaskController);
router.post  ('/:id/reflection',  saveReflectionController);
router.delete('/:id',             deleteTaskController);

module.exports = router;