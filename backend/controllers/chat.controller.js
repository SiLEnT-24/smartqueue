const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');
const bot = require('../services/chatbot.service');

const last = new Map();
exports.send = asyncHandler(async (req, res) => {
  const now = Date.now(), key = String(req.user._id);
  if (now - (last.get(key) || 0) < 2000) throw new HttpError(429, 'Please wait a moment before sending another message.');
  last.set(key, now);

  const message = typeof req.body.message === 'string' ? req.body.message.trim().slice(0, 500) : '';
  if (!message) throw new HttpError(400, 'Type a question first.');
  // Only accept plain user/assistant text from the client, short and limited in number.
  const history = (Array.isArray(req.body.history) ? req.body.history : []).slice(-6)
    .filter((m) => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, 500) }));
  while (history.length && history[0].role !== 'user') history.shift();
  res.json(await bot.reply(req.user, message, history));
});
