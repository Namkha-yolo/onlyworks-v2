# OnlyWorks API

Vercel serverless functions for OnlyWorks backend.

## Architecture

This API provides:
- **Authentication** via Google OAuth
- **AI Analysis** using Gemini (goal-aware screenshot analysis)
- **Session Management** (start, stop, pause, resume)
- **Team Management** (create, join, invite, leave)
- **Screenshot Upload & Storage**

## Environment Variables

Required in Vercel:

```
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-key
GOOGLE_API_KEY=your-google-api-key (for Gemini)
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
JWT_SECRET=your-random-32-char-secret
RESEND_API_KEY=your-resend-api-key
VERCEL_URL=auto-set-by-vercel
```

## Endpoints

### Authentication
- `POST /api/auth/oauth-init` - Initialize OAuth flow
- `POST /api/auth/oauth-callback` - Handle OAuth callback
- `POST /api/auth/validate-session` - Validate JWT session
- `POST /api/auth/refresh-token` - Refresh expired JWT

### Screenshots
- `POST /api/screenshots/upload` - Upload screenshot (requires auth)
- `POST /api/screenshots/analyze` - Analyze screenshots with AI (requires auth)

### Sessions
- `POST /api/sessions/start` - Start new session (requires auth)
- `POST /api/sessions/stop` - Stop active session (requires auth)
- `POST /api/sessions/pause` - Pause active session (requires auth)
- `POST /api/sessions/resume` - Resume paused session (requires auth)
- `GET /api/sessions/stats` - Get session statistics (requires auth)

### Teams
- `POST /api/teams/create` - Create new team (requires auth)
- `POST /api/teams/join` - Join existing team (requires auth)
- `POST /api/teams/invite` - Invite member to team (requires auth)
- `POST /api/teams/leave` - Leave team (requires auth)
- `GET /api/teams/list` - List user's teams (requires auth)

## Authentication

All protected endpoints require JWT token in header:
```
Authorization: Bearer <jwt_token>
```

## AI Analysis

The screenshot analysis uses Gemini with OnlyWorks' goal-aware prompt to:
- Analyze work against personal/team goals
- Identify blockers and next steps
- Recognize contributions and invisible work
- Suggest automation opportunities
- Generate standup-ready summaries

Cost: ~$0.015-0.025 per analysis (50% cheaper than old approach)

## Deployment

1. Push this branch to GitHub
2. Connect to Vercel project
3. Vercel auto-deploys serverless functions from `/api` folder
4. Functions automatically access env vars set in Vercel dashboard

## Database Schema

See main README for full database schema. Key tables:
- `users` - User accounts
- `sessions` - Work sessions
- `screenshots` - Screenshot metadata
- `ai_analysis` - AI analysis results
- `teams` - Teams
- `team_members` - Team memberships
- `goals` - Personal and team goals

## Local Development

For local testing, set `ONLYWORKS_SERVER_URL=http://localhost:3000` in Electron app.

Run Vercel dev server:
```bash
vercel dev
```

This will start local serverless functions at `http://localhost:3000/api/*`
