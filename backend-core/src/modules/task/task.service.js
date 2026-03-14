const { prisma } = require('../../core/database/prismaClient');
const { getCache, setCache, deleteCache } = require('../../core/cache/cacheManager');

// ── Get All Tasks ─────────────────────────────
async function getTasks(userId) {
  const cacheKey = `tasks:${userId}`;
  const cached   = await getCache(cacheKey);
  if (cached) return cached;

  const tasks = await prisma.task.findMany({
    where:   { userId },
    orderBy: [{ dayNumber: 'asc' }, { stepNumber: 'asc' }],
    include: {
      reflection:  true,
      testResults: { orderBy: { createdAt: 'desc' }, take: 1 },
      _count:      { select: { codeSubmissions: true } },
    },
  });

  await setCache(cacheKey, tasks, 60);
  return tasks;
}

// ── Get Single Task ───────────────────────────
async function getTask(userId, taskId) {
  const task = await prisma.task.findFirst({
    where:   { id: taskId, userId },
    include: {
      reflection: true,
      testCases:  { where: { isHidden: false } },
      testResults:     { orderBy: { createdAt: 'desc' }, take: 3 },
      codeSubmissions: { orderBy: { submittedAt: 'desc' }, take: 1 },
    },
  });
  if (!task) throw { status: 404, message: 'Task not found' };
  return task;
}

// ── Create Task ───────────────────────────────
async function createTask(userId, body) {
  const task = await prisma.task.create({
    data: { userId, ...body },
  });
  await deleteCache(`tasks:${userId}`);
  return task;
}

// ── Delete Task ───────────────────────────────
async function deleteTask(userId, taskId) {
  const task = await prisma.task.findFirst({ where: { id: taskId, userId } });
  if (!task) throw { status: 404, message: 'Task not found' };

  await prisma.task.delete({ where: { id: taskId } });
  await deleteCache(`tasks:${userId}`);
  await deleteCache(`task_stats:${userId}`);
}

// ── Activate Task ─────────────────────────────
async function activateTask(userId, taskId) {
  const task = await prisma.task.findFirst({ where: { id: taskId, userId } });
  if (!task) throw { status: 404, message: 'Task not found' };

  // Deactivate any currently active task first
  await prisma.task.updateMany({
    where: { userId, status: 'active' },
    data:  { status: 'pending' },
  });

  const updated = await prisma.task.update({
    where: { id: taskId },
    data:  { status: 'active' },
  });

  await deleteCache(`tasks:${userId}`);
  return updated;
}

// ── Start Timer ───────────────────────────────
async function startTimer(userId, taskId) {
  const task = await prisma.task.findFirst({ where: { id: taskId, userId } });
  if (!task) throw { status: 404, message: 'Task not found' };
  if (task.status === 'completed') throw { status: 400, message: 'Task already completed' };

  const updated = await prisma.task.update({
    where: { id: taskId },
    data:  { status: 'in_progress', timerStartedAt: new Date() },
  });

  await deleteCache(`tasks:${userId}`);
  return updated;
}

// ── Stop Timer ────────────────────────────────
async function stopTimer(userId, taskId) {
  const task = await prisma.task.findFirst({ where: { id: taskId, userId } });
  if (!task) throw { status: 404, message: 'Task not found' };
  if (!task.timerStartedAt) throw { status: 400, message: 'Timer not started' };

  const minutesSpent = Math.round(
    (new Date() - new Date(task.timerStartedAt)) / 60000
  );
  return { minutesSpent, startedAt: task.timerStartedAt };
}

// ── Complete Task ─────────────────────────────
async function completeTask(userId, taskId) {
  const task = await prisma.task.findFirst({ where: { id: taskId, userId } });
  if (!task) throw { status: 404, message: 'Task not found' };
  if (task.status === 'completed') throw { status: 400, message: 'Task already completed' };

  const updated = await prisma.task.update({
    where: { id: taskId },
    data:  { status: 'completed', completedAt: new Date() },
  });

  await updateMastery(userId);
  await deleteCache(`tasks:${userId}`);
  await deleteCache(`dashboard:${userId}`);
  return updated;
}

// ── Save Reflection ───────────────────────────
async function saveReflection(userId, taskId, data) {
  const task = await prisma.task.findFirst({ where: { id: taskId, userId } });
  if (!task) throw { status: 404, message: 'Task not found' };

  const reflection = await prisma.taskReflection.upsert({
    where:  { taskId },
    update: { ...data, userId },
    create: { taskId, userId, ...data },
  });

  await deleteCache(`dashboard:${userId}`);
  return reflection;
}

// ── Get Today's Task ──────────────────────────
async function getTodayTask(userId) {
  const completed = await prisma.task.count({
    where: { userId, status: 'completed' },
  });

  const nextTask = await prisma.task.findFirst({
    where:   { userId, status: { not: 'completed' } },
    orderBy: [{ dayNumber: 'asc' }, { stepNumber: 'asc' }],
    include: { testCases: { where: { isHidden: false } } },
  });

  return {
    completedCount: completed,
    currentDay:     nextTask?.dayNumber || 1,
    task:           nextTask,
  };
}

// ── Get Task Stats ────────────────────────────
async function getTaskStats(userId) {
  const cacheKey = `task_stats:${userId}`;
  const cached   = await getCache(cacheKey);
  if (cached) return cached;

  const [total, completed, inProgress, byLevel] = await Promise.all([
    prisma.task.count({ where: { userId } }),
    prisma.task.count({ where: { userId, status: 'completed' } }),
    prisma.task.count({ where: { userId, status: 'in_progress' } }),
    prisma.task.groupBy({
      by:    ['level'],
      where: { userId },
      _count: { id: true },
    }),
  ]);

  const stats = {
    total,
    completed,
    inProgress,
    pending:        total - completed - inProgress,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    byLevel,
  };

  await setCache(cacheKey, stats, 120);
  return stats;
}

// ── Internal: Update Mastery ──────────────────
async function updateMastery(userId) {
  // Use COUNT queries instead of fetching every task row just to count them
  const [total, completed] = await Promise.all([
    prisma.task.count({ where: { userId } }),
    prisma.task.count({ where: { userId, status: 'completed' } }),
  ]);

  const mastery   = total > 0 ? Math.round((completed / total) * 100) : 0;

  await prisma.user.update({
    where: { id: userId },
    data:  { masteryPercent: mastery },
  });

  await updatePerformanceScore(userId);
}

// ── Internal: Update Performance Score ───────
async function updatePerformanceScore(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      masteryPercent: true,
      streakCurrent:  true,
      batchMember:    true,
      testResults: {
        orderBy: { createdAt: 'desc' },
        take:    10,
        select:  { score: true },
      },
    },
  });

  if (!user?.batchMember) return;

  const testAvg    = user.testResults.length > 0
    ? user.testResults.reduce((sum, t) => sum + t.score, 0) / user.testResults.length
    : 0;
  const streakBonus = Math.min(user.streakCurrent * 0.5, 10);
  const perf        = Math.min(
    Math.round(testAvg * 0.4 + user.masteryPercent * 0.4 + streakBonus + 10),
    100
  );

  await prisma.batchMember.update({
    where: { userId },
    data:  { performanceScore: perf },
  });
}

module.exports = {
  getTasks,
  getTask,
  createTask,
  deleteTask,
  activateTask,
  startTimer,
  stopTimer,
  completeTask,
  saveReflection,
  getTodayTask,
  getTaskStats,
};