function buildTokenCreatedMessage(token) {
  return `SmartQueue: token ${token.tokenNumber} created for ${token.department.name}. Estimated wait: ${token.estimatedWaitLabel}.`;
}

function buildTokenCalledMessage(token) {
  return `SmartQueue: token ${token.tokenNumber} for ${token.department.name} is called. Please go to ${token.counter || 'the counter'}.`;
}

function htmlEscape(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function emailSender() {
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME;
  if (!process.env.BREVO_API_KEY && !senderEmail && !senderName) return null;
  if (!process.env.BREVO_API_KEY || !senderEmail || !senderName)
    throw new Error('Brevo email configuration is incomplete');
  return { email: senderEmail, name: senderName };
}

async function sendBrevoRequest(endpoint, body, channel) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return null;

  let response;
  try {
    response = await fetch(`https://api.brevo.com/v3/${endpoint}`, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    throw new Error(error.name === 'TimeoutError' ? `Brevo ${channel} request timed out` : `could not reach Brevo for ${channel}`);
  }
  if (!response.ok) throw new Error(`Brevo rejected the ${channel} request (HTTP ${response.status})`);
  return true;
}

async function sendEmail(email, name, subject, textContent, htmlContent) {
  const sender = emailSender();
  if (!sender) return null;
  return sendBrevoRequest('smtp/email', {
    sender,
    to: [{ email, ...(name && { name }) }],
    subject,
    textContent,
    htmlContent,
  }, 'email');
}

async function sendTokenCreatedEmail(email, name, token) {
  const escapedToken = htmlEscape(token.tokenNumber);
  const escapedDepartment = htmlEscape(token.department.name);
  const escapedWait = htmlEscape(token.estimatedWaitLabel);
  return sendEmail(
    email,
    name,
    `Your SmartQueue token ${token.tokenNumber}`,
    buildTokenCreatedMessage(token),
    `<p>Your SmartQueue token <strong>${escapedToken}</strong> has been created for ${escapedDepartment}.</p><p>Estimated wait: ${escapedWait}.</p>`,
  );
}

async function sendTokenCalledEmail(email, name, token) {
  const escapedToken = htmlEscape(token.tokenNumber);
  const escapedDepartment = htmlEscape(token.department.name);
  const escapedCounter = htmlEscape(token.counter || 'the counter');
  return sendEmail(
    email,
    name,
    `Your SmartQueue token ${token.tokenNumber} is called`,
    buildTokenCalledMessage(token),
    `<p>Your SmartQueue token <strong>${escapedToken}</strong> for ${escapedDepartment} is called.</p><p>Please go to ${escapedCounter}.</p>`,
  );
}

async function sendTokenCreatedSms(phone, token) {
  const sender = process.env.BREVO_SMS_SENDER;
  if (!process.env.BREVO_API_KEY && !sender) return null;
  if (!process.env.BREVO_API_KEY || !sender) throw new Error('Brevo SMS configuration is incomplete');

  return sendBrevoRequest('transactionalSMS/sms', {
    sender,
    recipient: phone,
    content: buildTokenCreatedMessage(token),
    type: 'transactional',
  }, 'SMS');
}

module.exports = {
  buildTokenCreatedMessage,
  buildTokenCalledMessage,
  sendTokenCreatedEmail,
  sendTokenCalledEmail,
  sendTokenCreatedSms,
};
