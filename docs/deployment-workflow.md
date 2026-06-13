# Deployment Workflow — LKP Parduli Rasa

## Pre-Deploy Verification

Before deploying, run the full verification suite:

```bash
npm run verify:all
```

This runs in sequence:
1. Module structural checks (`verify:modules`)
2. Architecture guardrails (`verify:architecture`)
3. All automated tests (`test`)
4. Dev smoke test (`smoke:dev`)

All must pass before deploying.

---

## Deployment Steps

### 1. Install dependencies
```bash
npm ci
```

### 2. Run database migrations (if DATABASE_URL is set)
```bash
npm run db:migrate
```

### 3. Verify environment
The app auto-validates environment on startup in production mode.
To check manually before starting:
```bash
NODE_ENV=production node -e "import('./apps/api/src/config/env.js')"
```

### 4. Build frontend (if deploying web)
```bash
npm run build
```

### 5. Start the application
```bash
npm start
```

---

## Runtime Modes

| Condition | Mode | Persistence |
|---|---|---|
| `DATABASE_URL` set | Database (Drizzle) | PostgreSQL |
| `DATABASE_URL` not set | Memory | In-memory (demo/dev) |

The repository factory (`apps/api/src/repositories/index.js`) auto-selects the mode.

---

## Health Checks

After deployment, verify the app is running:

| Endpoint | Purpose |
|---|---|
| `GET /health` | Liveness probe (always fast) |
| `GET /ready` | Readiness probe (runtime + config check) |
| `GET /api/health` | API-prefixed health check |
| `GET /api/ready` | API-prefixed readiness check |
| `GET /api/diagnostics` | Extended runtime info (admin debug) |

---

## Environment Variables

### Required in Production
- `DATABASE_URL` — PostgreSQL connection string
- `BETTER_AUTH_SECRET` — Auth session secret (non-placeholder)
- `BETTER_AUTH_URL` — Public auth URL (non-localhost)
- `CLIENT_ORIGIN` — Frontend origin (non-localhost)
- `CORS_ORIGINS` — Allowed CORS origins
- `UPLOADS_DIR` — Writable upload directory path
- `MIDTRANS_SERVER_KEY` — Payment gateway server key
- `WEBHOOK_BASE_URL` — Public webhook URL for payment callbacks

### Optional
- `APP_NAME` — Application display name
- `HOST` — Bind address (default: localhost)
- `PORT` — Server port (default: 3001)
- `API_BASE_PATH` — API path prefix (default: /api)
- `AUTH_BASE_PATH` — Auth path prefix
- `MIDTRANS_CLIENT_KEY` — Payment gateway client key
- `MIDTRANS_IS_PRODUCTION` — "true" for live Midtrans
- `DATABASE_SSL_MODE` — require / no-verify / disable

---

## Rollback

If deployment fails:
1. Check startup logs for environment validation errors
2. Verify `GET /health` and `GET /ready` endpoints
3. If the issue is a code regression, revert to previous commit
4. If the issue is config, fix environment variables and restart

---

## Verification Commands Reference

```bash
npm run verify:modules      # Structural module check (12 checks)
npm run verify:architecture # Boundary guardrails (11,000+ checks)
npm run test:api            # Contract tests (42+ tests)
npm run test:domain         # Use case tests (41+ tests)
npm run smoke:dev           # Full dev smoke test
npm run verify:all          # All of the above in sequence
```
