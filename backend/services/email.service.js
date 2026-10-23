// Email alerts. Provider order: Brevo API (BREVO_API_KEY + BREVO_SENDER_EMAIL), then Gmail SMTP. Never throws.
const nodemailer = require('nodemailer');
let transporter = null;

const brevoOn = () => !!(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL);
const gmailOn = () => !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
const provider = () => (brevoOn() ? 'brevo' : gmailOn() ? 'gmail' : null);
const enabled = () => !!provider();

async function viaBrevo(to, subject, text) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ sender: { name: process.env.BREVO_SENDER_NAME || 'SmartQueue', email: process.env.BREVO_SENDER_EMAIL }, to: [{ email: to }], subject, textContent: text }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) { const b = await res.json().catch(() => ({})); console.error('Brevo email failed:', res.status, b.message || ''); }
  return res.ok;
}

async function viaGmail(to, subject, text) {
  if (!transporter) transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD.replace(/\s/g, '') } });
  await transporter.sendMail({ from: `SmartQueue <${process.env.GMAIL_USER}>`, to, subject, text });
  return true;
}

async function send(to, subject, text) {
  if (!enabled() || !to) return false;
  try { return provider() === 'brevo' ? await viaBrevo(to, subject, text) : await viaGmail(to, subject, text); }
  catch (e) { console.error('Email failed:', e.code || e.message); return false; }   // never print keys
}
module.exports = { enabled, provider, send };
