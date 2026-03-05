const { reviewCode, explainCode, detectBugs, optimiseCode } = require('../services/codeReviewer.service');

async function review(req, res, next) {
  try {
    const { code, language, context } = req.body;
    if (!code?.trim()) return res.status(400).json({ success: false, message: 'code required' });
    if (code.length > 10000) return res.status(400).json({ success: false, message: 'Code too large. Max 10,000 chars.' });
    res.json({ success: true, review: await reviewCode(req.user, { code, language, context }) });
  } catch (err) { next(err); }
}

async function explain(req, res, next) {
  try {
    const { code, language } = req.body;
    if (!code?.trim()) return res.status(400).json({ success: false, message: 'code required' });
    res.json({ success: true, explanation: await explainCode(req.user, { code, language }) });
  } catch (err) { next(err); }
}

async function bugs(req, res, next) {
  try {
    const { code, language, errorMessage } = req.body;
    if (!code?.trim()) return res.status(400).json({ success: false, message: 'code required' });
    res.json({ success: true, result: await detectBugs(req.user, { code, language, errorMessage }) });
  } catch (err) { next(err); }
}

async function optimise(req, res, next) {
  try {
    const { code, language, bottleneck } = req.body;
    if (!code?.trim()) return res.status(400).json({ success: false, message: 'code required' });
    res.json({ success: true, result: await optimiseCode(req.user, { code, language, bottleneck }) });
  } catch (err) { next(err); }
}

module.exports = { review, explain, bugs, optimise };