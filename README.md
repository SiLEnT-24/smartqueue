# SmartQueue

## Server configuration

Use Node.js 18 or newer. First create the server environment file from the project root:

```powershell
Copy-Item server\.env.example server\.env
```

The backend reads environment variables from `server/.env`. Set `MONGO_URI` and replace `JWT_SECRET` with a long random value before starting it. For example, generate a secret with:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Install dependencies and start the backend:

```powershell
Set-Location server
npm install
npm run dev
```

### Optional integrations

- **Administrator registration:** Set `ADMIN_REGISTRATION_CODE` to a long random secret and share it only with the people allowed to register as admins. The same code is required for each admin registration, up to five admin accounts total. Existing admin accounts can continue to log in. Do not expose this value in the client environment.
- **AI analytics summary:** Set `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` to a model slug available from OpenRouter. The key stays on the backend; admins can generate an aggregate-metrics summary from the administration dashboard. If the key is unset, the summary endpoint reports that the integration is not configured.
- **Brevo email and SMS:** Set `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` (a verified sender), and `BREVO_SENDER_NAME` to email token receipts to the student's account email. Set `BREVO_SMS_SENDER` as well to enable SMS for students who save an E.164 phone number (for example, `+14155552671`) and opt in on their Profile. The same Brevo API key is used for both channels. A delivery failure does not undo token creation; the API response and server log report when a notification could not be sent.

Keep `server/.env` private and never commit API keys or credentials. The `.env` file is ignored by Git; `.env.example` contains placeholders only.