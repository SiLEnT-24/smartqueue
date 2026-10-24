# SmartQueue – College Queue Management System

SmartQueue is a web-based college service queue management application that allows users to generate digital tokens, track queue positions, and view estimated waiting times. Administrators can manage departments, counters, users, and queue operations.

## Features

- User registration, login, and role-based authentication.
- Digital token generation and real-time queue tracking.
- Estimated waiting times and queue positions.
- Admin dashboard for managing queues and college services.
- Live updates using Socket.IO.
- Notifications, feedback, and analytics reports.
- Optional AI assistant powered by OpenRouter.

## User Roles

### 1. User
- Register and log in to the application.
- View available departments and services.
- Generate digital queue tokens.
- Track token status, queue position, and waiting time.
- Cancel eligible tokens.
- Receive notifications and submit feedback.
- Manage personal profile and notification preferences.
- Ask the AI assistant questions about SmartQueue.

### 2. Admin
- Log in through administrator authentication.
- View operational statistics and queue status.
- Manage users and administrator accounts.
- Create and manage departments and service counters.
- Call the next token and manage token status.
- Assign priority tokens when required.
- View analytics, feedback, and audit logs.
- Export reports as CSV files.
- Generate optional AI-powered analytics summaries.

**Access control:** Users can manage only their own profiles, tokens, and feedback. Administrators can manage queues and administrative operations across departments. Admin registration requires a configured registration code.

## Technology Stack

- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** Node.js, Express.js
- **Database:** MongoDB, Mongoose
- **Authentication:** JWT, bcrypt
- **Real-time Updates:** Socket.IO
- **AI Integration:** OpenRouter API

## Project Structure

```text
SmartQueue/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── tests/
│   ├── .env.example
│   └── server.js
└── frontend/
    ├── src/
    │   ├── components/
    │   ├── context/
    │   ├── pages/
    │   ├── api.js
    │   └── App.jsx
    └── vite.config.js
```

## Requirements

- Node.js 18 or newer
- npm
- MongoDB or MongoDB Atlas
- OpenRouter API key (optional)

## Installation and Setup

**1. Configure the backend**

```powershell
cd backend
npm install
```

Create `backend/.env` from `.env.example` and configure the required environment variables.

**2. Start the backend**

```powershell
npm run dev
```

**3. Start the frontend**

Open another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Testing and Build

```powershell
# Backend tests
cd backend
npm test

# Frontend production build
cd frontend
npm run build
```

## Deployment

For Vercel, set the project **Root Directory** to `backend` so its Node function
configuration and dependencies are used. Set `MONGO_URI`, `JWT_SECRET`,
`CLIENT_URL`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, and `BREVO_SENDER_NAME` in
the deployment environment to email users when they create a token or an admin
calls it. The sender address must be verified with Brevo.

To send token-creation SMS, also set `BREVO_SMS_SENDER`. Each user must save a
phone number in E.164 format and enable SMS in their profile; SMS is not sent
without that explicit opt-in. The token creation response includes `emailSent` and `smsSent` plus status
fields (`sent`, `not_configured`, `not_enabled`, `phone_missing`, or `failed`).
When Brevo rejects an email, `emailError` includes its reason (for example,
invalid API key or sender configuration), and the server logs the failure.

The Express API and transactional email work in Vercel functions, but Vercel
functions do not provide a persistent Socket.IO server. The live `notify` and
`token:update` events require deployment on a long-running Node.js host; without
that, users can still see their updated token status by refreshing or fetching
their token, and will receive the call email when Brevo is configured.

## Security Notes

- Keep API keys and environment variables private.
- Use a strong JWT secret.
- Enforce role-based authorization on protected API routes.
- Never run the demo seeder on a database containing important data.

---

**SmartQueue – Making college services faster, smarter, and more accessible.**
