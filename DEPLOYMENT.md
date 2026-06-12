# HoldMyResume — Production Deployment Guide

## Architecture Overview

```
Frontend (Cloudflare Pages)  →  Backend (Cloudflare Workers)
       ↓                               ↓              ↓
 React + Vite                  Hono.js API      D1 SQL + KV + AI
```

---

## Pre-requisites

- Cloudflare account (free tier works)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) v3+ installed globally: `npm install -g wrangler`
- Node.js 18+

---

## Step 1: Deploy the Backend Worker

### 1.1 Authenticate Wrangler
```bash
wrangler login
```

### 1.2 Create Production D1 Database
```bash
cd backend
wrangler d1 create holdmyresume-db
# Copy the database_id from the output and update wrangler.toml
```

### 1.3 Run Database Migrations
```bash
wrangler d1 execute holdmyresume-db --file=schema.sql
```

### 1.4 Create the KV Namespace for Rate Limiting
```bash
wrangler kv namespace create "LIMITER_KV"
# Copy the id from the output and update wrangler.toml
```

### 1.5 Update `wrangler.toml` with Production IDs
```toml
name = "holdmyresume-backend"
main = "src/index.ts"
compatibility_date = "2024-06-11"

[[kv_namespaces]]
binding = "LIMITER_KV"
id = "YOUR_KV_NAMESPACE_ID"    # Replace with real ID

[[d1_databases]]
binding = "DB"
database_name = "holdmyresume-db"
database_id = "YOUR_D1_DATABASE_ID"  # Replace with real ID

[ai]
binding = "AI"
```

### 1.6 Set Production Secrets (Never commit these!)
```bash
# Generate a strong JWT secret (e.g., openssl rand -hex 32)
wrangler secret put JWT_SECRET
# Paste your production secret key when prompted

wrangler secret put FRONTEND_URL
# Paste your Cloudflare Pages URL e.g. https://holdmyresume.pages.dev
```

### 1.7 Deploy the Worker
```bash
wrangler deploy
# Note your deployed Worker URL: https://holdmyresume-backend.YOUR_ACCOUNT.workers.dev
```

---

## Step 2: Deploy the Frontend (Cloudflare Pages)

### 2.1 Build the Frontend
```bash
cd frontend
cp .env.example .env
# Edit .env to set VITE_API_URL to your Worker URL from Step 1.7
npm run build
```

### 2.2 Deploy via Wrangler Pages
```bash
wrangler pages deploy dist --project-name holdmyresume
```

Or connect your GitHub repository to Cloudflare Pages directly:
1. Go to [Cloudflare Pages Dashboard](https://dash.cloudflare.com/pages)
2. Create a new project → Connect to Git
3. Set build command: `npm run build`
4. Set build output directory: `dist`
5. Add environment variable: `VITE_API_URL` → your Worker URL

---

## Step 3: Final Configuration

After both are deployed:

1. **Update CORS**: Set `FRONTEND_URL` secret on your Worker to your Pages URL
2. **Test Auth**: Try registering/logging in via the Auth modal
3. **Test AI**: Try the Resume Analyzer and Generate Resume flows
4. **Verify Security Center**: Open Security & Cookies tab from the dashboard

---

## Security Checklist Before Going Live

- [x] `JWT_SECRET` set to a strong random value (not the dev key)
- [x] `FRONTEND_URL` set to prevent unauthorized CORS origins
- [x] Mock-token bypass only works when `JWT_SECRET` matches the local dev key
- [x] Input size caps: 50KB max per API text payload
- [x] Rate limiting: 10 AI generations per user per day via KV
- [x] D1 queries use parameterized bindings (no SQL injection risk)
- [x] File processing is 100% client-side (no file uploads to server)

---

## Local Development

```bash
# Terminal 1: Backend
cd backend
wrangler dev

# Terminal 2: Frontend  
cd frontend
cp .env.example .env
# .env already has VITE_API_URL=http://localhost:8787
npm run dev
```

Visit: http://localhost:5173 (or whichever port Vite uses)

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `401 Unauthorized` from API | Check JWT_SECRET matches; use mock-token in dev mode |
| History not loading | D1 database not migrated; run `wrangler d1 execute` |
| AI not working | Enable Workers AI binding in Cloudflare dashboard |
| CORS errors in production | Set `FRONTEND_URL` secret on your Worker |
| Build chunk size warning | Normal for this bundle size; acceptable for MVP |
