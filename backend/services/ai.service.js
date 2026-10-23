// Optional AI. Uses OpenRouter if OPENROUTER_API_KEY is set, otherwise Anthropic if ANTHROPIC_API_KEY is set.
const provider = () => (process.env.OPENROUTER_API_KEY ? 'openrouter' : process.env.ANTHROPIC_API_KEY ? 'anthropic' : null);
const enabled = () => !!provider();
const fail = (status, message) => Object.assign(new Error(message), { status });

const SUMMARY_SYSTEM = `You analyse queue statistics for a college service office.
Use ONLY the numbers provided. Do not invent causes you cannot see in the data; if data is thin, say so.
Reply with: 4 short bullet-point observations, then 2 practical suggestions for staffing or scheduling.
Plain language, under 180 words. Remind the reader that waiting times are estimates.`;

async function viaOpenRouter({ system, messages, maxTokens }) {
  const model = process.env.OPENROUTER_MODEL;
  if (!model) throw fail(501, 'Set OPENROUTER_MODEL in server/.env (for example openrouter/free).');
  let res;
  try {
    res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'X-OpenRouter-Title': 'SmartQueue' },
      body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, ...messages] }),
      signal: AbortSignal.timeout(30000),
    });
  } catch { throw fail(502, 'Could not reach OpenRouter. Try again later.'); }
  if (!res.ok) {
    console.error('OpenRouter error', res.status);   // never log the key
    const msg = { 401: 'OpenRouter rejected the key. Check OPENROUTER_API_KEY.', 402: 'OpenRouter account has no credits for this model. Pick a :free model or add credits.',
      404: 'That model is not available. Choose another slug in OPENROUTER_MODEL.', 429: 'OpenRouter rate limit reached (free models have low limits). Try again later.' }[res.status];
    throw fail(502, msg || 'OpenRouter returned an error.');
  }
  const data = await res.json();
  const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!text) throw fail(502, 'The model returned an empty answer. Try again or choose another model.');
  return String(text).trim();
}

async function viaAnthropic({ system, messages, maxTokens }) {
  let res;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: maxTokens, system, messages }),
      signal: AbortSignal.timeout(25000),
    });
  } catch { throw fail(502, 'Could not reach the AI service. Try again later.'); }
  if (!res.ok) { console.error('AI service error', res.status); throw fail(502, res.status === 401 ? 'The AI key was rejected. Check ANTHROPIC_API_KEY.' : 'The AI service returned an error.'); }
  const data = await res.json();
  return (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
}

async function complete({ system, messages, maxTokens = 600 }) {
  const p = provider();
  if (!p) throw fail(501, 'AI is not configured on this server.');
  return p === 'openrouter' ? viaOpenRouter({ system, messages, maxTokens }) : viaAnthropic({ system, messages, maxTokens });
}

// Used by the Assistant chatbot: (system prompt, messages, max tokens)
const chat = (system, messages, maxTokens = 300) => complete({ system, messages, maxTokens });

const summarise = (payload) => complete({ system: SUMMARY_SYSTEM, messages: [{ role: 'user', content: `Queue statistics (JSON):\n${JSON.stringify(payload)}` }] });

module.exports = { enabled, provider, complete, chat, summarise };
