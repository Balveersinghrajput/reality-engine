const { prisma } = require('../../core/database/prismaClient');
const Groq        = require('groq-sdk');

// Lazy init — crashes on startup are prevented; key is checked on first use
let _groq = null;
function getGroq() {
  if (!_groq) {
    if (!process.env.OPENAI_API_KEY) throw new Error('GROQ_API_KEY is not set in .env');
    _groq = new Groq({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _groq;
}


// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────
function calcGrade(pct) {
  if (pct >= 90) return 'S';
  if (pct >= 75) return 'A';
  if (pct >= 60) return 'B';
  if (pct >= 45) return 'C';
  return 'F';
}

function normalize(s) {
  return String(s).toLowerCase().replace(/\s+/g, ' ').trim();
}

// Grade one answer. Returns { isCorrect, pointsEarned }
function gradeAnswer(question, givenRaw) {
  const given   = normalize(givenRaw);
  const correct = normalize(question.correct);

  let isCorrect = false;

  if (question.type === 'mcq' || question.type === 'truefalse') {
    // Exact match OR first character match (A → "A. something")
    isCorrect = given === correct || given.startsWith(correct[0]);
  } else {
    // Short / code: check that at least 50% of key terms appear
    const terms      = correct.split(' ').filter(w => w.length > 3);
    const matchCount = terms.filter(t => given.includes(t)).length;
    isCorrect = terms.length === 0 || matchCount >= Math.ceil(terms.length * 0.5);
  }

  return {
    isCorrect,
    pointsEarned: isCorrect ? (question.points ?? 10) : 0,
  };
}

// ─────────────────────────────────────────────────────────────────
// generateTest
// Creates AI questions for a given task (used by task-linked flow)
// ─────────────────────────────────────────────────────────────────
async function generateTest(userId, taskId) {
  // Load the task so we know its title / difficulty
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
    select: { id: true, title: true, difficulty: true },
  });
  if (!task) throw Object.assign(new Error('Task not found'), { status: 404 });

  const difficulty = task.difficulty || 'intermediate';
  const qCount     = difficulty === 'hard' ? 12 : difficulty === 'easy' ? 8 : 10;

  const completion = await getGroq().chat.completions.create({
    model:      'llama-3.3-70b-versatile',
    max_tokens: 2000,
    messages: [
      {
        role:    'system',
        content: 'You are SIGMA — a rigorous AI exam builder. Output ONLY valid JSON. No markdown, no extra text.',
      },
      {
        role:    'user',
        content: `Generate a ${difficulty} exam on "${task.title}" with exactly ${qCount} questions.
Mix types: MCQ (~40%), code analysis (~25%), short answer (~20%), true/false (~15%).
Output ONLY a JSON array:
[
  {"id":1,"type":"mcq","question":"...","options":["A","B","C","D"],"correct":"A","explanation":"...","points":10},
  {"id":2,"type":"code","question":"What does this output?","code":"const x = 1 + '2'","correct":"12","explanation":"...","points":15},
  {"id":3,"type":"truefalse","question":"...","options":["True","False"],"correct":"True","explanation":"...","points":5},
  {"id":4,"type":"short","question":"...","correct":"key terms","explanation":"...","points":10}
]
Rules: MCQ = 4 options exactly. Code questions must have a real runnable snippet. Difficulty = ${difficulty}.`,
      },
    ],
  });

  const raw     = completion.choices?.[0]?.message?.content ?? '[]';
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const questions = JSON.parse(cleaned);

  return { taskId, task: task.title, difficulty, questions };
}

// ─────────────────────────────────────────────────────────────────
// submitTest
// Grades answers, saves to DB, awards XP
// ─────────────────────────────────────────────────────────────────
async function submitTest(userId, taskId, answers, questions, timeTaken) {
  // Grade every question
  let totalPts  = 0;
  let earnedPts = 0;
  const gradedAnswers = [];

  for (const q of questions) {
    totalPts += q.points ?? 10;

    const submitted = answers.find(a => String(a.questionId) === String(q.id));

    if (!submitted?.answer) {
      gradedAnswers.push({ questionId: q.id, answer: '', isCorrect: false, pointsEarned: 0 });
      continue;
    }

    const { isCorrect, pointsEarned } = gradeAnswer(q, submitted.answer);
    earnedPts += pointsEarned;
    gradedAnswers.push({ questionId: q.id, answer: submitted.answer, isCorrect, pointsEarned });
  }

  const percentage = totalPts > 0 ? Math.round((earnedPts / totalPts) * 100) : 0;
  const grade      = calcGrade(percentage);
  const passed     = percentage >= 60;

  // XP multiplier by difficulty
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
    select: { difficulty: true, title: true },
  });
  const diff     = task?.difficulty || 'intermediate';
  const multi    = diff === 'hard' ? 2.5 : diff === 'easy' ? 1 : 1.5;
  const xpEarned = Math.round(percentage * multi);

  // Save result
  const saved = await prisma.taskResult.create({
    data: {
      userId,
      challengeTitle:   `Test: ${task?.title || taskId}`,
      score:            percentage,
      xpEarned,
      timeTakenSeconds: timeTaken,
      estimatedMinutes: Math.ceil(timeTaken / 60),
      difficulty:       diff,
    },
  });

  // Award XP to user
  if (xpEarned > 0) {
    await prisma.user.update({
      where: { id: userId },
      data:  { xp: { increment: xpEarned } },
    });
  }

  return {
    id:          saved.id,
    score:       earnedPts,
    total:       totalPts,
    percentage,
    grade,
    passed,
    xpEarned,
    timeTaken,
    answers:     gradedAnswers,
    correct:     gradedAnswers.filter(a => a.isCorrect).length,
    wrong:       gradedAnswers.filter(a => a.answer && !a.isCorrect).length,
    skipped:     gradedAnswers.filter(a => !a.answer).length,
  };
}

// ─────────────────────────────────────────────────────────────────
// getTestHistory
// Returns last 50 test results for the user, newest first
// ─────────────────────────────────────────────────────────────────
async function getTestHistory(userId) {
  const results = await prisma.taskResult.findMany({
    where:   { userId, challengeTitle: { startsWith: 'Test:' } },
    orderBy: { completedAt: 'desc' },
    take:    50,
    select: {
      id:               true,
      challengeTitle:   true,
      score:            true,
      xpEarned:         true,
      timeTakenSeconds: true,
      difficulty:       true,
      completedAt:      true,
    },
  });

  return results.map(r => ({
    id:          r.id,
    topic:       r.challengeTitle.replace(/^Test:\s*/, '').trim(),
    percentage:  r.score,
    grade:       calcGrade(r.score),
    xpEarned:    r.xpEarned,
    timeTaken:   r.timeTakenSeconds,
    difficulty:  r.difficulty,
    date:        r.completedAt,
    passed:      r.score >= 60,
  }));
}

// ─────────────────────────────────────────────────────────────────
// getTestResult
// Returns one result by id (must belong to user)
// ─────────────────────────────────────────────────────────────────
async function getTestResult(userId, resultId) {
  const r = await prisma.taskResult.findFirst({
    where: { id: resultId, userId },
  });
  if (!r) throw Object.assign(new Error('Result not found'), { status: 404 });

  return {
    id:         r.id,
    topic:      r.challengeTitle.replace(/^Test:\s*/, '').trim(),
    percentage: r.score,
    grade:      calcGrade(r.score),
    xpEarned:   r.xpEarned,
    timeTaken:  r.timeTakenSeconds,
    difficulty: r.difficulty,
    date:       r.completedAt,
    passed:     r.score >= 60,
  };
}

// ─────────────────────────────────────────────────────────────────
// getLeaderboard
// Top 50 users ranked by avg score on Test: results
// Optional topic filter
// ─────────────────────────────────────────────────────────────────
async function getLeaderboard(userId, topic) {
  const titleWhere = topic
    ? { startsWith: `Test: ${topic}` }
    : { startsWith: 'Test:' };

  // Aggregate per user
  const raw = await prisma.taskResult.groupBy({
    by:      ['userId'],
    where:   { challengeTitle: titleWhere },
    _avg:    { score: true },
    _max:    { score: true },
    _count:  { id: true },
    _sum:    { xpEarned: true },
    orderBy: { _avg: { score: 'desc' } },
    take:    50,
  });

  // Fetch usernames + tiers
  const userIds = raw.map(r => r.userId);
  const users   = await prisma.user.findMany({
    where:  { id: { in: userIds } },
    select: { id: true, username: true, tier: true },
  });
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  // Build leaderboard
  const leaderboard = raw.map((r, i) => ({
    rank:          i + 1,
    userId:        r.userId,
    username:      userMap[r.userId]?.username || 'Unknown',
    tier:          userMap[r.userId]?.tier     || 'developing',
    avgScore:      Math.round(r._avg.score ?? 0),
    bestScore:     r._max.score ?? 0,
    testCount:     r._count.id,
    totalXP:       r._sum.xpEarned ?? 0,
    isCurrentUser: r.userId === userId,
  }));

  // Current user's rank (even if outside top 50)
  const myRank = raw.findIndex(r => r.userId === userId) + 1 || null;

  // Topics the current user has attempted (for filter pills)
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

  return { leaderboard, myRank, myTopics, topic };
}

module.exports = {
  generateTest,
  submitTest,
  getTestHistory,
  getTestResult,
  getLeaderboard,
};