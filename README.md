# TeleSync — AI Powered Telegram Social Media Automation Scheduler

A SaaS-style full-stack MERN platform to create, schedule, and auto-publish posts to Telegram channels using AI-generated captions.

---

## Features

- JWT-based authentication (register/login/logout)
- Email OTP verification on registration (SMTP)
- OAuth 2.0 login via Google and GitHub
- Dashboard with stats (total, scheduled, published, failed)
- Schedule posts with date/time picker
- AI caption generation via Gemini API
- Image URL support with preview
- Automatic publishing via node-cron (every minute)
- Telegram Bot API integration
- Filter posts by status
- Dark mode responsive UI

---

## Tech Stack

| Layer     | Technology                                        |
|-----------|---------------------------------------------------|
| Frontend  | React, Vite, Tailwind CSS, React Router           |
| Backend   | Node.js, Express.js                               |
| Database  | MongoDB + Mongoose                                |
| Auth      | JWT + bcryptjs + Passport.js                      |
| OAuth     | Google OAuth 2.0, GitHub OAuth 2.0                |
| Email     | Nodemailer (SMTP / Gmail App Password)            |
| Scheduler | node-cron                                         |
| Telegram  | Telegram Bot API (axios)                          |
| AI        | Google Gemini API (gemini-2.0-flash)              |

---

## Project Structure

```
Social_Media_Automation/
├── server/
│   ├── config/
│   │   ├── db.js
│   │   └── passport.js              Google + GitHub OAuth strategies
│   ├── controllers/
│   │   ├── authController.js        register, verifyOtp, resendOtp, login, oauthCallback
│   │   ├── postController.js
│   │   └── aiController.js
│   ├── middleware/authMiddleware.js
│   ├── models/
│   │   ├── User.js                  isVerified, otp, otpExpiry, authProvider, avatar
│   │   └── Post.js
│   ├── routes/
│   │   ├── authRoutes.js            OTP + OAuth routes
│   │   ├── postRoutes.js
│   │   └── aiRoutes.js
│   ├── services/
│   │   ├── telegramService.js
│   │   ├── geminiService.js
│   │   └── emailService.js          Nodemailer OTP email sender
│   ├── scheduler/postScheduler.js
│   ├── server.js
│   ├── .env
│   └── package.json
└── client/
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   ├── Sidebar.jsx
    │   │   └── PostCard.jsx
    │   ├── context/AuthContext.jsx
    │   ├── pages/
    │   │   ├── Login.jsx            + Google/GitHub OAuth buttons
    │   │   ├── Register.jsx         + Google/GitHub OAuth buttons
    │   │   ├── VerifyOtp.jsx        6-digit OTP input + resend
    │   │   ├── OAuthSuccess.jsx     OAuth redirect handler
    │   │   ├── Dashboard.jsx
    │   │   ├── CreatePost.jsx
    │   │   └── Posts.jsx
    │   ├── routes/ProtectedRoute.jsx
    │   ├── services/api.js
    │   └── App.jsx
    └── package.json
```

---

## Environment Variables

Create `server/.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/telesync
JWT_SECRET=your_jwt_secret_here
CLIENT_URL=http://localhost:5173

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHANNEL_ID=@your_channel_username

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here

# SMTP (Gmail App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

---

## Installation

### 1. Clone the repository
```bash
git clone <repo-url>
cd Social_Media_Automation
```

### 2. Backend setup
```bash
cd server
npm install
cp .env.example .env   # fill in your values
npm run dev
```

### 3. Frontend setup
```bash
cd client
npm install
npm run dev
```

---

## Email OTP Setup (Gmail)

1. Enable **2-Step Verification** on your Google account
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Generate an App Password for "Mail"
4. Add to `server/.env`:
```env
SMTP_USER=your@gmail.com
SMTP_PASS=your_16_char_app_password
```

**Flow:**
- User registers → OTP sent to email → User enters 6-digit code → Account verified → Redirected to dashboard
- Unverified users trying to login are redirected back to OTP page
- OTP expires in 10 minutes, resend available after 60 seconds

---

## Google OAuth Setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → APIs & Services → Credentials → Create OAuth 2.0 Client ID
3. Set the following:

| Field | Value |
|---|---|
| Authorized JavaScript Origins | `http://localhost:5173` |
| Authorized JavaScript Origins | `http://localhost:5000` |
| Authorized Redirect URIs | `http://localhost:5000/api/auth/google/callback` |

4. Copy Client ID and Secret to `server/.env`

---

## GitHub OAuth Setup

1. Go to [github.com/settings/developers](https://github.com/settings/developers)
2. Click **New OAuth App** and fill in:

| Field | Value |
|---|---|
| Application name | `social-media-automation` |
| Homepage URL | `http://localhost:5173` |
| Authorization callback URL | `http://localhost:5000/api/auth/github/callback` |

3. Copy Client ID and Secret to `server/.env`

---

## Telegram Bot Setup

1. Open Telegram and message **@BotFather**
2. Send `/newbot` and follow prompts to get your `BOT_TOKEN`
3. Create a Telegram Channel (public or private)
4. Add your bot as an **Administrator** to the channel
5. Set `TELEGRAM_CHANNEL_ID` to `@channelname` (public) or numeric chat ID (private)

To get a private channel ID:
- Forward a message from the channel to `@userinfobot`

---

## Gemini AI Setup

1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Create an API key (starts with `AQ.` for AI Studio keys)
3. Add it to `GEMINI_API_KEY` in your `.env`
4. Key must be passed via `x-goog-api-key` header (handled automatically)

---

## API Endpoints

| Method | Endpoint                       | Auth | Description                    |
|--------|--------------------------------|------|--------------------------------|
| POST   | /api/auth/register             | No   | Register + send OTP            |
| POST   | /api/auth/verify-otp           | No   | Verify OTP, returns JWT        |
| POST   | /api/auth/resend-otp           | No   | Resend OTP to email            |
| POST   | /api/auth/login                | No   | Login with email + password    |
| GET    | /api/auth/me                   | Yes  | Get current user               |
| GET    | /api/auth/google               | No   | Initiate Google OAuth          |
| GET    | /api/auth/google/callback      | No   | Google OAuth callback          |
| GET    | /api/auth/github               | No   | Initiate GitHub OAuth          |
| GET    | /api/auth/github/callback      | No   | GitHub OAuth callback          |
| GET    | /api/posts                     | Yes  | Get all posts                  |
| GET    | /api/posts/stats               | Yes  | Get post statistics            |
| POST   | /api/posts/create              | Yes  | Create scheduled post          |
| PUT    | /api/posts/:id                 | Yes  | Update pending post            |
| DELETE | /api/posts/:id                 | Yes  | Delete post                    |
| POST   | /api/ai/generate-caption       | Yes  | Generate AI caption            |

---

## Screenshots

> _Dashboard, Create Post, Posts List, OTP Verification — dark mode UI_

---

## Future Improvements

- [ ] Multiple Telegram channel support
- [ ] Rich text / HTML formatting editor
- [ ] Post analytics and engagement tracking
- [ ] Recurring/repeating post schedules
- [ ] File/media upload to cloud storage (S3 / Cloudinary)
- [ ] Team collaboration & roles
- [ ] Webhook for real-time Telegram delivery status
- [ ] Email notifications on post success/failure
- [ ] Mobile app (React Native)
- [ ] Support for other platforms (WhatsApp, Discord)
