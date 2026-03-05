const { chat, parseJSON } = require('../config/openai');

const PRESETS = {
  mentor:     { temperature: 0.7,  maxTokens: 1200 },
  analyst:    { temperature: 0.3,  maxTokens: 1500 },
  harsh:      { temperature: 0.85, maxTokens: 800  },
  json:       { temperature: 0.2,  maxTokens: 2000, jsonMode: true },
  roadmap:    { temperature: 0.4,  maxTokens: 3000 },
  codeReview: { temperature: 0.3,  maxTokens: 2000 },
};

async function chatWithPreset(preset, system, messages, overrides = {}) {
  return chat({ system, messages, ...PRESETS[preset] || PRESETS.mentor, ...overrides });
}

async function chatJSON(system, messages, overrides = {}) {
  const text = await chat({ system, messages, ...PRESETS.json, ...overrides });
  return parseJSON(text);
}

module.exports = { chat, chatWithPreset, chatJSON, parseJSON, PRESETS };