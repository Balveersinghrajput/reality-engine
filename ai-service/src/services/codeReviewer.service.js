const { chatWithPreset, chatJSON } = require('./openai.service');
const { buildSystemPrompt, buildCodeContext } = require('./contextBuilder.service');

async function reviewCode(user, { code, language, context }) {
  if (!code?.trim()) throw new Error('Code is required');
  const sys = buildSystemPrompt('codeReview', user, 'Respond with JSON only:\n{"summary":"2 sentences","score":0,"grade":"S|A|B|C|F","issues":[{"severity":"critical|major|minor|suggestion","category":"correctness|performance|security|readability|bestPractice","line":"ref","issue":"what","fix":"how"}],"strengths":[],"refactored":"improved code or null"}');
  const block = buildCodeContext(code, language, context);
  try {
    const result = await chatJSON(sys, [{ role: 'user', content: 'Review this code:\n\n' + block }], { maxTokens: 2500 });
    return { ...result, language, linesOfCode: code.split('\n').length };
  } catch {
    const plain = await chatWithPreset('codeReview', buildSystemPrompt('codeReview', user), [{ role: 'user', content: 'Review this ' + (language||'') + ' code:\n\n' + block }]);
    return { summary: plain.slice(0, 300), score: null, grade: null, issues: [], strengths: [], refactored: null, rawReview: plain, language };
  }
}

async function explainCode(user, { code, language }) {
  if (!code?.trim()) throw new Error('Code is required');
  const sys = buildSystemPrompt('mentor', user, 'Explain: 1) What it does overall 2) How it works step-by-step 3) Key concepts. Tailor to ' + user.level + ' level.');
  return chatWithPreset('analyst', sys, [{ role: 'user', content: 'Explain:\n\n' + buildCodeContext(code, language) }]);
}

async function detectBugs(user, { code, language, errorMessage }) {
  const sys = buildSystemPrompt('codeReview', user, 'Respond with JSON:\n{"bugsFound":true,"bugs":[{"line":"ref","description":"","impact":"","fix":""}],"rootCause":"","fixedCode":""}');
  const content = buildCodeContext(code, language) + (errorMessage ? '\nError: ' + errorMessage : '');
  return chatJSON(sys, [{ role: 'user', content: 'Find bugs:\n\n' + content }], { maxTokens: 1500 });
}

async function optimiseCode(user, { code, language, bottleneck }) {
  const sys = buildSystemPrompt('codeReview', user, 'Respond with JSON:\n{"issues":[],"optimised":"optimised code","improvements":[],"bigO":{"before":"","after":""}}');
  const content = buildCodeContext(code, language) + (bottleneck ? '\nBottleneck: ' + bottleneck : '');
  return chatJSON(sys, [{ role: 'user', content: 'Optimise:\n\n' + content }], { maxTokens: 1800 });
}

module.exports = { reviewCode, explainCode, detectBugs, optimiseCode };