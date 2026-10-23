# SmartQueue

SmartQueue is a college service queue management application. Students join department queues with digital tokens and follow their place in line. Staff manage the tokens assigned to their counters, while administrators configure services and counters and review operational reports.

The project includes a React single-page application, an Express API, MongoDB persistence, Socket.IO live updates, and an optional OpenRouter-powered assistant.

## Contents

- [Features](#features)
- [Roles and application pages](#roles-and-application-pages)
- [Queue and wait-time behavior](#queue-and-wait-time-behavior)
- [Technology and architecture](#technology-and-architecture)
- [Project structure](#project-structure)
- [Requirements](#requirements)
- [Local setup](#local-setup)
- [Configuration](#configuration)
- [Seed data](#seed-data)
- [HTTP API](#http-api)
- [Realtime events](#realtime-events)
- [Testing and production build](#testing-and-production-build)
- [Security and privacy notes](#security-and-privacy-notes)

## Features

- Student registration, login, profile updates, and role-based access.
- Department service discovery and token generation.
- Live token status, queue position, people ahead, and estimated waiting time.
- Counter assignment, queue calling, and token lifecycle actions for staff.
- Administrative management of users, departments, counters, and priority tokens.
- Public queue status and reception display with optional spoken announcements.
- In-app alerts, browser notifications, and optional token-created email/SMS notifications.
- Student feedback after service and administrative feedback summaries.
- Date/department-filtered analytics, CSV export, and optional AI-generated analytics summaries.
- SmartQueue assistant for token, queue, wait-time, service, alert, feedback, and app-use questions.

## Roles and application pages

### Students

- **My dashboard** — see active tokens and recent queue updates.
- **Get a token** — choose an available department and join its queue.
- **Assistant** — ask about your token, queues, services, waits, and how to use the app.
- **Feedback** — rate a completed service and optionally leave a comment.
- **Profile** — update account details and notification preferences.

### Staff

- **My counter** — see the queue for the departments handled by the assigned counter.
- Call the next token and start, complete, skip, hold, resume, or mark a token as a no-show, subject to allowed state changes.
- Use the assistant for SmartQueue guidance.

Staff members are assigned a counter by an administrator. A staff member can only manage tokens for departments served by that counter.

### Administrators

- **Overview** — review operational totals.
- **Counters** — configure counters, departments served, and staff assignments.
- **Analytics** — inspect queue metrics, request an optional AI summary, and export CSV reports.
- **Feedback** — review ratings and comments.
- **Assistant** — ask SmartQueue usage questions.
- Create/manage users and departments, enable priority handling, and inspect audit logs.

Public registration always creates a student account. Staff accounts are created or assigned by an administrator. Admin registration requires the configured shared code and is limited to five administrator accounts.

### Public visitors

- View active departments and public queue status.
- Open the reception display without logging in.
- Use the home page assistant shortcut; sign-in is required to start a chat.

## Queue and wait-time behavior

- Token numbers are sequential per department and day. The sequence is incremented atomically to avoid duplicate numbers when requests arrive together.
- A user can have at most one active token in a department.
- A token can only move through valid lifecycle transitions. Completed, cancelled, and no-show tokens are inactive and cannot re-enter the queue.
- Priority tokens are handled ahead of regular waiting tokens when priority is enabled and assigned by an administrator.
- A token is allocated only to an active counter that serves its department.
- Estimated waiting time is calculated as:

  ```text
  people ahead × average service time ÷ active counters
  ```

- The average uses recent completed services from the current day when enough samples exist; otherwise, the department's configured default service time is used. The displayed result is rounded up and is an estimate, not a guarantee.

## Technology and architecture

| Area | Technology |
| --- | --- |
| Frontend | React 18, Vite, React Router, Tailwind CSS, Recharts, Lucide icons |
| API | Node.js, Express 4 |
| Database | MongoDB with Mongoose |
| Authentication | JSON Web Tokens (JWT), bcrypt password hashing |
| Realtime updates | Socket.IO |
| AI | OpenRouter API, optional and server-configured |
| Notifications | In-app/browser notifications; optional Brevo token-created email and SMS |

The frontend calls the backend through `/api`. During local development, Vite serves the client on port `5173` and proxies API and Socket.IO requests to the backend on port `5000`. The Express API connects to MongoDB before it begins listening.

## Project structure

```text
smartqueue/
├── backend/
│   ├── config/          # MongoDB connection
│   ├── controllers/     # HTTP request handlers
│   ├── middleware/     # Authentication, role checks, error handling
│   ├── models/          # Mongoose schemas and indexes
│   ├── routes/          # API route registration
│   ├── services/        # Queue, estimates, analytics, assistant, notifications
│   ├── tests/           # Node.js test suite
│   ├── utils/           # Socket.IO, dates, and shared helpers
│   ├── .env.example     # Backend configuration template
│   ├── seed.js          # Local demo-data seeder (destructive)
│   └── server.js        # Express and Socket.IO entry point
└── frontend/
    ├── src/
    │   ├── components/  # Shared layout and UI components
    │   ├── context/     # Auth, socket, theme, and toast state
    │   ├── pages/       # Student, staff, admin, public, and assistant views
    │   ├── api.js       # Authenticated API client
    │   └── App.jsx      # Client-side routes
    └── vite.config.js   # Development server and API/socket proxies
```

## Requirements

- Node.js 18 or newer.
- npm.
- A MongoDB server or MongoDB Atlas database accessible to the backend.
- An OpenRouter account and API key only if AI responses are desired. Built-in assistant rules do not require an AI key.

## Local setup

### 1. Configure the backend

From the repository root, create the backend environment file:

```powershell
Copy-Item backend\.env.example backend\.env
```

Set `MONGO_URI` to your MongoDB connection string. Replace `JWT_SECRET` with a private random value. One way to generate a secret is:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Install backend dependencies and start the API:

```powershell
Set-Location backend
npm install
npm run dev
```

The development server uses Node's watch mode. To run without watch mode, use `npm start`.

### 2. Start the frontend

In a second terminal, from the repository root:

```powershell
Set-Location frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`). The frontend uses the Vite proxy to reach the backend at `http://localhost:5000`.

### 3. Create an administrator account

Set a private `ADMIN_REGISTRATION_CODE` in `backend/.env`, start the application, and use the **Administrator registration** page at `/admin-register`. Keep the code private and do not put it in frontend configuration.

An administrator can then create staff accounts, configure departments and counters, and assign staff members.

### Health check

With the backend running, visit `http://localhost:5000/api/health`. A healthy API returns:

```json
{ "ok": true }
```

## Configuration

The backend loads settings from `backend/.env`. Never put server secrets in frontend environment variables.

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGO_URI` | Yes | MongoDB connection URI. |
| `JWT_SECRET` | Yes | Secret used to sign and verify user sessions. The server will not start without it. |
| `PORT` | No | Express/Socket.IO port; defaults to `5000`. |
| `JWT_EXPIRES_IN` | No | JWT lifetime; defaults to `7d`. |
| `CLIENT_URL` | No | Allowed browser origin for API and Socket.IO CORS; defaults to permissive development behavior. Set this to the deployed client origin in production. |
| `APP_TZ` | No | Time zone used for day-based queue and analytics calculations; defaults to `Asia/Kolkata`. |
| `ADMIN_REGISTRATION_CODE` | For admin self-registration | Shared code required at `/admin-register`; admin accounts are capped at five. |
| `OPENROUTER_API_KEY` | No | Enables OpenRouter responses for the assistant and AI analytics summaries. |
| `OPENROUTER_MODEL` | For assistant AI | OpenRouter model slug. Set this when using the assistant with OpenRouter. |
| `BREVO_API_KEY` | No | Brevo API key for token-created email and SMS delivery. |
| `BREVO_SENDER_EMAIL` | For Brevo email | Verified sender address. |
| `BREVO_SENDER_NAME` | For Brevo email | Display name used for token-created emails. |
| `BREVO_SMS_SENDER` | For Brevo SMS | Sender name used for token-created SMS messages. |

### Optional AI assistant

Set `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` in `backend/.env` and restart the backend. The key stays on the server. With the key absent, the assistant answers supported questions using built-in rules and live queue data. With OpenRouter configured, it sends the assistant prompt, recent conversation, and limited live queue context to the selected model.

The assistant is intended only for SmartQueue questions. It cannot create, cancel, or modify tokens. It uses active department queue details and the signed-in student's active tokens; it does not need names, email addresses, phone numbers, feedback, or old token history to answer. The chat endpoint limits messages to one per user every two seconds per backend process.

### Optional email and SMS

When configured, Brevo can send a token-created email to the student's account email. SMS requires the Brevo key and sender, a phone number saved in E.164 format (for example, `+14155552671`), and the student's SMS opt-in on their Profile. Notification delivery is separate from token creation; a notification failure does not roll back the token.

Browser notification permission is managed by the user's browser. In-app alerts are delivered through the live socket connection.

## Seed data

The optional backend seeder creates sample departments, counters, staff, and student accounts:

```powershell
Set-Location backend
npm run seed
```

> **Warning:** `seed.js` deletes existing users, departments, counters, tokens, feedback, audit logs, and daily sequence data before inserting demo data. Use only with a disposable development database. Never run it against production or data you need to keep.

After seeding, use the demo student/staff accounts printed by the script to sign in. Create an administrator separately through `/admin-register` using `ADMIN_REGISTRATION_CODE`.

## HTTP API

All endpoints below are prefixed with `/api`. Protected routes require:

```http
Authorization: Bearer <JWT>
```

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | Public | API health check. |
| `POST` | `/auth/register` | Public | Register a student account. |
| `POST` | `/auth/register-admin` | Registration code | Register an administrator, subject to the configured limit. |
| `POST` | `/auth/login` | Public | Log in and receive a JWT. |
| `GET` | `/auth/me` | Signed in | Read the current profile. |
| `PATCH` | `/auth/me` | Signed in | Update profile, password, phone, or SMS preference. |
| `GET` | `/departments` | Public | List active departments. |
| `GET` | `/queue/display` | Public | Get data for the reception display. |
| `GET` | `/queue/status/:departmentId` | Public | Read a department's queue status. |
| `POST` | `/tokens` | Signed in | Create a token for a department (student workflow). |
| `GET` | `/tokens/mine` | Signed in | List the current user's recent tokens. |
| `GET` | `/tokens` | Staff/admin | List tokens with optional `status`, `department`, and `day` filters. |
| `GET` | `/tokens/:id` | Signed in | Read a token; students can read only their own. |
| `POST` | `/tokens/:id/cancel` | Signed in | Cancel an eligible token. |
| `PATCH` | `/tokens/:id/priority` | Admin | Change token priority and record a reason. |
| `GET` | `/staff/queue` | Staff/admin | Read queue and counter status. |
| `POST` | `/staff/call-next` | Staff/admin | Call the next token at the assigned counter. |
| `POST` | `/staff/auto-call` | Staff/admin | Automatically allocate a token for a department. |
| `POST` | `/staff/tokens/:id/:action` | Staff/admin | Perform a supported token lifecycle action. |
| `GET` | `/admin/users` | Admin | List users. |
| `POST` | `/admin/users` | Admin | Create a student, staff, or administrator account. |
| `PATCH` | `/admin/users/:id` | Admin | Update a user's name, role, or active state. |
| `GET` | `/admin/departments` | Admin | List all departments. |
| `POST` | `/admin/departments` | Admin | Create a department. |
| `PATCH` | `/admin/departments/:id` | Admin | Update a department. |
| `GET` | `/admin/counters` | Staff/admin | List counters. |
| `POST` | `/admin/counters` | Admin | Create a counter. |
| `PATCH` | `/admin/counters/:id` | Admin | Update a counter or staff assignment. |
| `GET` | `/admin/audit-logs` | Admin | Read recent audit records. |
| `POST` | `/feedback` | Signed in | Submit a 1–5 rating for the user's completed token. |
| `GET` | `/feedback/pending` | Signed in | List the user's completed tokens without feedback. |
| `GET` | `/feedback` | Admin | Read feedback summary and recent comments. |
| `POST` | `/chat` | Signed in | Ask the assistant; body accepts `{ "message": "...", "history": [] }`. |
| `GET` | `/analytics` | Admin | Read date/department-filtered operational analytics. |
| `GET` | `/analytics/summary` | Admin | Generate an AI summary of aggregate analytics (requires OpenRouter configuration). |
| `GET` | `/analytics/export` | Admin | Download a CSV report. |

## Realtime events

The frontend connects to Socket.IO through the Vite `/socket.io` proxy during development.

- Authenticated users join their private `user:<id>` room.
- Non-student users join the staff room.
- The public display joins the `display` room; department pages can join `dept:<departmentId>`.
- Queue changes publish `queue:update`, `display:update`, and `token:update` events to the relevant rooms.
- `notify` events provide in-app alerts and optional browser notifications.

## Testing and production build

Run the backend tests:

```powershell
Set-Location backend
npm test
```

Build the frontend for production:

```powershell
Set-Location frontend
npm run build
```

The frontend build output is written to `frontend/dist`. Configure your production hosting to serve that client build and route `/api` and Socket.IO traffic to the backend. Set a production MongoDB URI, strong JWT secret, and explicit client origin before deployment.

## Security and privacy notes

- Keep `backend/.env` and all credentials private. Do not commit it or expose backend secrets to the browser.
- Use HTTPS in production and a strong, unique `JWT_SECRET`.
- Set `CLIENT_URL` to the deployed frontend origin instead of relying on permissive development defaults.
- Admin registration uses a shared secret; share it only with trusted administrators.
- The assistant does not execute queue actions; it only explains how to use the application.
- Avoid running the demo seeder on any database containing data that must be retained.
