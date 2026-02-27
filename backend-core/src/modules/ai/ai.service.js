const OpenAI = require('openai');
const { prisma } = require('../../core/database/prismaClient');
const { getCache, setCache } = require('../../core/cache/cacheManager');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  });

// ── System Prompts ────────────────────────────
function getSystemPrompt(user, contextType) {
  const base = `You are an AI mentor for Reality Engine — a competitive tech learning platform.
User: ${user.username}
Track: ${user.targetTrack}
Level: ${user.level}
Mode: ${user.mode}
Mastery: ${user.masteryPercent}%
Reality Score: ${user.realityScore}`;

  const modeInstructions = {
    harsh: `${base}
IMPORTANT: This user is in HARSH MODE. Be brutally honest. 
No sugar coating. Point out weaknesses directly.
Compare them to industry standards aggressively.
If they're underperforming, tell them clearly.`,
    competitive: `${base}
Be motivating but realistic. Push them to compete harder.
Always mention their rank and how to improve it.
Focus on beating competitors.`,
    normal: `${base}
Be helpful, supportive and educational.
Give clear explanations and encouragement.`,
  };

  const contextAddons = {
    code_review: `\nYou are reviewing their code. Focus on:
1. Correctness and logic
2. Time/space complexity
3. Code quality and best practices
4. Security issues
5. How to improve it`,
    task_generation: `\nYou are generating learning tasks. Each task must:
1. Be specific and actionable
2. Have clear learning objectives
3. Include estimated time
4. Be appropriate for their level
5. Build on previous knowledge`,
    chat: `\nAnswer questions about their tech track clearly.
Give practical examples. Reference real-world applications.`,
  };

  return (modeInstructions[user.mode] || modeInstructions.normal) +
    (contextAddons[contextType] || contextAddons.chat);
}

// ── AI Chat ───────────────────────────────────
async function chat(userId, message, contextType = 'chat') {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      username: true,
      targetTrack: true,
      level: true,
      mode: true,
      masteryPercent: true,
      realityScore: true,
    },
  });

  if (!user) throw { status: 404, message: 'User not found' };

  // Get recent conversation history
  const history = await prisma.aIInteraction.findMany({
    where: { userId, contextType },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { query: true, response: true },
  });

  const messages = [
    { role: 'system', content: getSystemPrompt(user, contextType) },
    ...history.reverse().flatMap(h => [
      { role: 'user', content: h.query },
      { role: 'assistant', content: h.response },
    ]),
    { role: 'user', content: message },
  ];

  const completion = await openai.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages,
    max_tokens: 1000,
    temperature: user.mode === 'harsh' ? 0.9 : 0.7,
  });

  const response = completion.choices[0].message.content;

  // Save interaction
  await prisma.aIInteraction.create({
    data: { userId, query: message, response, contextType },
  });

  return { response,model: 'llama-3.1-8b-instant' };
}

// ── Generate Tasks ────────────────────────────
async function generateTasks(userId) {
  const cacheKey = `generated_tasks:${userId}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      username: true,
      targetTrack: true,
      level: true,
      mode: true,
      masteryPercent: true,
      realityScore: true,
      tasks: {
        where: { status: 'completed' },
        orderBy: { completedAt: 'desc' },
        take: 5,
        select: { title: true, topic: true },
      },
    },
  });

  if (!user) throw { status: 404, message: 'User not found' };

  const completedTopics = user.tasks.map(t => t.topic).join(', ');

  const prompt = `Generate 5 learning tasks for a ${user.level} ${user.targetTrack} developer.
Recently completed topics: ${completedTopics || 'none yet'}
Mode: ${user.mode}

Return ONLY a JSON array with exactly this structure:
[
  {
    "title": "task title",
    "description": "detailed description of what to learn/do",
    "topic": "specific topic name",
    "dayNumber": 1,
    "stepNumber": 1,
    "level": "${user.level}",
    "estimatedMinutes": 45,
    "hasCodeChallenge": false
  }
]

Make tasks progressively harder. Day numbers should continue from ${user.tasks.length + 1}.`;

  const completion = await openai.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      { role: 'system', content: getSystemPrompt(user, 'task_generation') },
      { role: 'user', content: prompt },
    ],
    max_tokens: 2000,
    temperature: 0.7,
  });

  let tasks = [];
  try {
    const content = completion.choices[0].message.content;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      tasks = JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    throw { status: 500, message: 'Failed to parse AI response' };
  }

  // Save tasks to database
  const savedTasks = await Promise.all(
    tasks.map(task =>
      prisma.task.create({
        data: { userId, ...task },
      })
    )
  );

  await setCache(cacheKey, savedTasks, 3600);
  return savedTasks;
}

// ── Review Code ───────────────────────────────
async function reviewCode(userId, code, language, taskId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      username: true,
      targetTrack: true,
      level: true,
      mode: true,
      masteryPercent: true,
      realityScore: true,
    },
  });

  if (!user) throw { status: 404, message: 'User not found' };

  const prompt = `Review this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Provide a JSON response with exactly this structure:
{
  "aiScore": 75,
  "complexityNote": "O(n) time complexity explanation",
  "qualityNote": "code quality assessment",
  "suggestions": "specific improvements to make",
  "bugs": "any bugs found or none",
  "bestPractices": "best practices followed or violated"
}`;

  const completion = await openai.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      { role: 'system', content: getSystemPrompt(user, 'code_review') },
      { role: 'user', content: prompt },
    ],
    max_tokens: 1000,
    temperature: 0.3,
  });

  let review = {};
  try {
    const content = completion.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) review = JSON.parse(jsonMatch[0]);
  } catch (e) {
    review = {
      aiScore: 50,
      complexityNote: 'Unable to analyze',
      qualityNote: completion.choices[0].message.content,
      suggestions: 'Please review manually',
    };
  }

  // Save review if taskId provided
  if (taskId) {
    const submission = await prisma.codeSubmission.findFirst({
      where: { userId, taskId },
      orderBy: { submittedAt: 'desc' },
    });

    if (submission) {
      await prisma.codeReview.upsert({
        where: { submissionId: submission.id },
        update: {
          aiScore: review.aiScore || 50,
          complexityNote: review.complexityNote || '',
          qualityNote: review.qualityNote || '',
          suggestions: review.suggestions || '',
        },
        create: {
          submissionId: submission.id,
          aiScore: review.aiScore || 50,
          complexityNote: review.complexityNote || '',
          qualityNote: review.qualityNote || '',
          suggestions: review.suggestions || '',
        },
      });
    }
  }

  // Save AI interaction
  await prisma.aIInteraction.create({
    data: {
      userId,
      query: `Code review for ${language} code`,
      response: JSON.stringify(review),
      contextType: 'code_review',
    },
  });

  return review;
}

// ── Get Interaction History ───────────────────
async function getInteractionHistory(userId) {
  const history = await prisma.aIInteraction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      query: true,
      response: true,
      contextType: true,
      createdAt: true,
    },
  });
  return history;
}

module.exports = {
  chat,
  generateTasks,
  reviewCode,
  getInteractionHistory,
};
