# ToLink Backend

<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="80" alt="NestJS" />
</p>

<p align="center">
  REST API for the <strong>ToLink URL Shortener</strong> — built with NestJS, MongoDB, and TypeScript.
</p>

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 11 |
| Language | TypeScript 5 |
| Database | MongoDB via Mongoose 8 |
| Auth | JWT (httpOnly cookie) + Google OAuth 2.0 |
| Validation | class-validator + class-transformer |
| Docs | Swagger / OpenAPI |
| Email | Nodemailer (Gmail SMTP) |
| Security | Helmet, @nestjs/throttler |
| Analytics | geoip-lite, ua-parser-js |

---

## Features

- **URL Shortening** — Base62 short-code generation with collision handling
- **Custom Aliases** — User-defined short codes
- **Password-Protected Links** — bcrypt-hashed access control
- **Link Expiry** — Optional expiration date per URL
- **Click Analytics** — Per-click tracking: country, device, browser, OS, referrer
- **Analytics Overview** — Aggregated stats: total clicks, top countries, top referrers, click series
- **QR Code Support** — QR endpoints for any shortened link
- **Authentication** — Email/password signup + Google OAuth, session via httpOnly cookies
- **Email Verification** — Account activation flow via Nodemailer
- **Password Reset** — Secure token-based password reset emails
- **Rate Limiting** — Request throttling via @nestjs/throttler
- **Swagger UI** — Full API documentation at `/swagger`

---

## Project Structure

```
src/
├── config/                  # App configuration (ConfigModule)
├── modules/
│   ├── auth/                # Auth: signup, login, Google OAuth, JWT strategy
│   ├── urls/                # URL CRUD, short-code generation, redirection
│   ├── analytics/           # Click tracking and stats aggregation
│   ├── users/               # User profile management
│   ├── email/               # Nodemailer email service
│   └── qr/                  # QR code generation
├── schemas/                 # Mongoose schemas (User, Url, Analytics, DailyLinkStats)
├── utils/                   # Helpers: base62, cache, analytics
├── app.module.ts
└── main.ts
```

---

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 9
- A running MongoDB instance (local or Atlas)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create a `.env` file in the project root based on the variables below:

```env
# Database
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/tolink

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d

# App
PORT=8080
BASE_URL=http://localhost:8080
FRONTEND_URL=http://localhost:4000

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:8080/v1/auth/google/callback
```

> **Note:** For Gmail, use an [App Password](https://myaccount.google.com/apppasswords), not your account password.

### 3. Run the server

```bash
# Development (watch mode)
npm run start:dev

# Production build
npm run build
npm run start:prod
```

The API will be available at `http://localhost:8080`.  
Swagger docs at `http://localhost:8080/swagger`.

---

## API Overview

All routes are prefixed with `/v1` except the public redirection endpoint.

### Auth — `/v1/auth`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/signup` | Register a new user |
| POST | `/login` | Login and set session cookie |
| POST | `/logout` | Clear session cookie |
| GET | `/me` | Get current authenticated user |
| PUT | `/profile` | Update profile (name, etc.) |
| PUT | `/change-password` | Change account password |
| GET | `/google` | Initiate Google OAuth flow |
| GET | `/google/callback` | Google OAuth callback |
| POST | `/forgot-password` | Send password reset email |
| POST | `/reset-password` | Reset password via token |

### URLs — `/v1/urls`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/` | Create a shortened URL |
| GET | `/` | List current user's URLs |
| GET | `/:id` | Get a single URL by ID |
| PATCH | `/:id` | Update a URL |
| DELETE | `/:id` | Delete a URL |

### Redirection — `/r/:shortCode`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/r/:shortCode` | Redirect to original URL (tracks click) |

### Analytics — `/v1/analytics`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/overview` | Aggregated stats for all user links |
| GET | `/clicks-per-url` | Click count per URL |
| GET | `/clicks-series` | Click count over time |

---

## Scripts

```bash
npm run start:dev    # Start in watch mode
npm run build        # Compile TypeScript
npm run start:prod   # Run compiled output
npm run lint         # ESLint with auto-fix
npm run format       # Prettier format
npm run test         # Unit tests
npm run test:e2e     # End-to-end tests
npm run test:cov     # Coverage report
```

---

## Authentication

Sessions are handled via **httpOnly cookies** (`tolink_session`).  
The cookie is set on login/signup and cleared on logout.  
Protected routes require the `JwtAuthGuard`. Some endpoints use `OptionalJwtAuthGuard` to allow both authenticated and anonymous access.

---

## License

This project is **UNLICENSED** — private use only.
