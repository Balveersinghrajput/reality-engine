const { OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL, OPENAI_MAX_TOKENS } = require('./env');
let _client = null;

function getClient() {
  if (_client) return _client;
  if (!OPENAI_API_KEY) { console.warn('[ai-service] OPENAI_API_KEY not set'); return null; }
  const OpenAI = require('openai');
  _client = new OpenAI({ apiKey: OPENAI_API_KEY, baseURL: OPENAI_BASE_URL.trim() });
  console.log('[ai-service] client ready → ' + OPENAI_BASE_URL.trim());
  return _client;
}

async function chat({ system = '', messages = [], maxTokens, temperature = 0.7, jsonMode = false }) {
  const client = getClient();
  if (!client) throw new Error('AI client not initialised. Check OPENAI_API_KEY.');
  const sys = jsonMode
    ? system + '\n\nCRITICAL: Respond with valid JSON only. No markdown, no explanation. Start with { or [.'
    : system;
  const res = await client.chat.completions.create({
    model:      OPENAI_MODEL,
    max_tokens: maxTokens || OPENAI_MAX_TOKENS,
    temperature,
    messages: [
      ...(sys ? [{ role: 'system', content: sys }] : []),
      ...messages,
    ],
  });
  return res.choices?.[0]?.message?.content?.trim() ?? '';
}

function parseJSON(text) {
  try {
    return JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim());
  } catch {
    throw new Error('AI returned invalid JSON: ' + text.slice(0, 200));
  }
}

module.exports = { getClient, chat, parseJSON };