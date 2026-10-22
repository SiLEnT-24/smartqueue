const HttpError = require('../utils/httpError');

const summaryMetrics = (analytics) => ({
  range: analytics.range,
  totals: analytics.totals,
  averageWaitMinutes: analytics.avgWaitMin,
  averageServiceMinutes: analytics.avgServiceMin,
  departmentQueues: analytics.departmentQueues,
  busiestHours: analytics.hourly
    .filter((hour) => hour.tokens > 0)
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 5),
});

async function createAnalyticsSummary(analytics) {
  if (!process.env.OPENROUTER_API_KEY) throw new HttpError(503, 'AI summaries are not configured on the server');

  let response;
  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'x-title': 'SmartQueue',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
        max_tokens: 400,
        messages: [
          { role: 'system', content: 'Write a concise operational summary for a queue administrator. Use only the supplied aggregate metrics. Do not invent causes, facts, or metrics. Mention when values are unavailable or the data range has no tokens. Offer at most two practical observations.' },
          { role: 'user', content: JSON.stringify(summaryMetrics(analytics)) },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });
  } catch (error) {
    throw new HttpError(502, `AI summary request failed: ${error.name === 'TimeoutError' ? 'request timed out' : 'could not reach OpenRouter'}`);
  }

  if (!response.ok) throw new HttpError(502, `OpenRouter could not generate the summary (HTTP ${response.status})`);
  let data;
  try {
    data = await response.json();
  } catch {
    throw new HttpError(502, 'OpenRouter returned an invalid analytics summary response');
  }
  const summary = data.choices?.[0]?.message?.content;
  if (typeof summary !== 'string' || !summary.trim())
    throw new HttpError(502, 'OpenRouter returned an empty analytics summary');
  return summary.trim();
}

module.exports = { createAnalyticsSummary, summaryMetrics };
