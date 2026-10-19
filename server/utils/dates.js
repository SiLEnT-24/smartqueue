// "Day key" like 2026-10-19 in the configured timezone; token numbers reset daily.
const tz = () => process.env.APP_TZ || 'Asia/Kolkata';
exports.dayKey = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: tz() });
