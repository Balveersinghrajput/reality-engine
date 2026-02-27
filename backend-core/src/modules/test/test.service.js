const { prisma } = require('../../core/database/prismaClient');
const { getCache, setCache, deleteCache } = require('../../core/cache/cacheManager');

// ── Generate Test Questions ───────────────────
async function generateTest(userId, taskId) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
  });
  if (!task) throw { status: 404, message: 'Task not found' };

  // Get previous attempts
  const attempts = await prisma.testResult.count({
    where: { userId, taskId },
  });

  // Scale difficulty based on attempts and level
  let difficulty = task.level;
  if (attempts >= 2) difficulty = 'intermediate';
  if (attempts >= 4) difficulty = 'advanced';

  // Get test cases if code challenge
  const testCases = task.hasCodeChallenge
    ? await prisma.testCase.findMany({
        where: { taskId, isHidden: false },
      })
    : [];

  // Generate questions based on topic
  const questions = generateQuestions(task.topic, difficulty, attempts);

  return {
    taskId,
    topic: task.topic,
    difficulty,
    attemptNumber: attempts + 1,
    timeLimit: getTimeLimit(difficulty),
    questions,
    testCases,
  };
}

// ── Generate Questions Logic ──────────────────
function generateQuestions(topic, difficulty, attempts) {
  const questionBank = {
    beginner: [
      {
        id: 'q1',
        type: 'mcq',
        question: `What is the main purpose of ${topic}?`,
        options: [
          'To organize code structure',
          'To handle data efficiently',
          'To improve performance',
          'To manage user interface',
        ],
        correct: 0,
        points: 10,
      },
      {
        id: 'q2',
        type: 'mcq',
        question: `Which is a best practice in ${topic}?`,
        options: [
          'Writing clean readable code',
          'Using global variables everywhere',
          'Avoiding comments',
          'Ignoring error handling',
        ],
        correct: 0,
        points: 10,
      },
      {
        id: 'q3',
        type: 'mcq',
        question: `What does DRY principle mean in ${topic}?`,
        options: [
          "Don't Repeat Yourself",
          'Do Repeat Yourself',
          'Data Retrieval Yesterday',
          'Dynamic Response Yield',
        ],
        correct: 0,
        points: 10,
      },
    ],
    intermediate: [
      {
        id: 'q1',
        type: 'mcq',
        question: `What is time complexity of binary search in ${topic}?`,
        options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'],
        correct: 1,
        points: 15,
      },
      {
        id: 'q2',
        type: 'mcq',
        question: `Which design pattern is best for ${topic}?`,
        options: ['Singleton', 'Observer', 'Factory', 'All can apply'],
        correct: 3,
        points: 15,
      },
      {
        id: 'q3',
        type: 'mcq',
        question: `How do you handle async operations in ${topic}?`,
        options: [
          'Callbacks only',
          'Promises and async/await',
          'Synchronous code only',
          'Global variables',
        ],
        correct: 1,
        points: 15,
      },
    ],
    advanced: [
      {
        id: 'q1',
        type: 'mcq',
        question: `What is the best optimization strategy for ${topic} at scale?`,
        options: [
          'Caching + indexing',
          'Adding more servers',
          'Rewriting in another language',
          'Reducing features',
        ],
        correct: 0,
        points: 20,
      },
      {
        id: 'q2',
        type: 'mcq',
        question: `How would you implement fault tolerance in ${topic}?`,
        options: [
          'Circuit breaker pattern',
          'Ignore errors',
          'Single point of failure',
          'Manual restarts',
        ],
        correct: 0,
        points: 20,
      },
      {
        id: 'q3',
        type: 'mcq',
        question: `What monitoring approach works best for ${topic}?`,
        options: [
          'No monitoring needed',
          'Metrics + logs + traces',
          'Console.log only',
          'Manual checking',
        ],
        correct: 1,
        points: 20,
      },
    ],
  };

  return questionBank[difficulty] || questionBank['beginner'];
}

function getTimeLimit(difficulty) {
  const limits = { beginner: 300, intermediate: 480, advanced: 600 };
  return limits[difficulty] || 300;
}

// ── Submit Test ───────────────────────────────
async function submitTest(userId, data) {
  const { taskId, answers, timeTaken } = data;

  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
  });
  if (!task) throw { status: 404, message: 'Task not found' };

  const attempts = await prisma.testResult.count({
    where: { userId, taskId },
  });

  let difficulty = task.level;
  if (attempts >= 2) difficulty = 'intermediate';
  if (attempts >= 4) difficulty = 'advanced';

  const questions = generateQuestions(task.topic, difficulty, attempts);

  // Grade answers
  let correct = 0;
  let totalPoints = 0;
  let earnedPoints = 0;

  questions.forEach(q => {
    totalPoints += q.points;
    const userAnswer = answers.find(a => a.questionId === q.id);
    if (userAnswer && parseInt(userAnswer.answer) === q.correct) {
      correct++;
      earnedPoints += q.points;
    }
  });

  const score = totalPoints > 0
    ? Math.round((earnedPoints / totalPoints) * 100)
    : 0;
  const passed = score >= 60;

  // Save result
  const result = await prisma.testResult.create({
    data: {
      userId,
      taskId,
      score,
      timeTaken,
      difficulty,
      totalQ: questions.length,
      correctQ: correct,
      attemptNum: attempts + 1,
      passed,
    },
  });

  // Update performance score
  await updateUserPerformance(userId);
  await deleteCache(`dashboard:${userId}`);

  return {
    result,
    score,
    passed,
    correct,
    total: questions.length,
    feedback: getFeedback(score),
    nextDifficulty: passed ? getNextDifficulty(difficulty) : difficulty,
  };
}

function getFeedback(score) {
  if (score >= 90) return '🔥 Excellent! You mastered this topic.';
  if (score >= 75) return '✅ Good job! Solid understanding.';
  if (score >= 60) return '⚡ Passed. Review weak areas.';
  return '❌ Failed. Study the topic again before retrying.';
}

function getNextDifficulty(current) {
  const order = ['beginner', 'intermediate', 'advanced'];
  const idx = order.indexOf(current);
  return order[Math.min(idx + 1, order.length - 1)];
}

async function updateUserPerformance(userId) {
  const recentTests = await prisma.testResult.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { score: true },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { masteryPercent: true, streakCurrent: true },
  });

  const testAvg = recentTests.length > 0
    ? recentTests.reduce((s, t) => s + t.score, 0) / recentTests.length
    : 0;

  const streakBonus = Math.min((user?.streakCurrent || 0) * 0.5, 10);
  const performanceScore = Math.min(
    Math.round(testAvg * 0.4 + (user?.masteryPercent || 0) * 0.4 + streakBonus + 10),
    100
  );

  await prisma.batchMember.updateMany({
    where: { userId },
    data: { performanceScore },
  });
}

// ── Get Test History ──────────────────────────
async function getTestHistory(userId) {
  const cacheKey = `test_history:${userId}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const history = await prisma.testResult.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      task: { select: { title: true, topic: true } },
    },
  });

  await setCache(cacheKey, history, 120);
  return history;
}

// ── Get Test Result ───────────────────────────
async function getTestResult(userId, testId) {
  const result = await prisma.testResult.findFirst({
    where: { id: testId, userId },
    include: {
      task: { select: { title: true, topic: true, level: true } },
    },
  });
  if (!result) throw { status: 404, message: 'Test result not found' };
  return result;
}

module.exports = {
  generateTest,
  submitTest,
  getTestHistory,
  getTestResult,
};