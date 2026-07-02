# sAgent Deployment Runbook for Agents

> This document is written for an automation agent that needs to clone, configure, run, verify, deploy, or troubleshoot the sAgent project. Follow the checklist in order. Do not commit secrets.

## 0. Project Facts

- Repository: `https://github.com/Usernames686/SAgent`
- Default branch: `main`
- Monorepo package manager: `pnpm`
- Required runtime: Node.js `>=20`, pnpm `>=9`
- Local Web URL: `http://localhost:4000`
- Local API URL: `http://localhost:4001/api/v1`
- Local Swagger URL: `http://localhost:4001/docs`
- API global prefix: `/api/v1`
- API app: `apps/api`
- Web app: `apps/web`
- Shared package: `packages/shared`
- Real secret files are intentionally not in Git:
  - `.env`
  - `apps/api/.env`
  - `apps/web/.env.local`
  - database files such as `apps/api/data/sagent.db`
  - `node_modules`, `.next`, `dist`, logs, cache files

## 1. Non-Negotiable Secret Policy

Never commit or push real API keys, server passwords, private keys, database dumps, or `.env` files.

Allowed:

- `.env.example`
- `apps/api/.env.example`
- documentation showing placeholder values

Not allowed:

- `LLM_API_KEY=sk-...`
- DeepSeek test keys
- SSH passwords
- `JWT_SECRET` real production values
- `GITHUB_CLIENT_SECRET`
- `SMTP_PASS`
- `.pem` files

Before every commit, run:

```bash
git grep -n -E "(sk-[A-Za-z0-9]{12,}|LLM_API_KEY=.*[A-Za-z0-9]{20,}|GITHUB_CLIENT_SECRET=.*[^[:space:]]|SMTP_PASS=.*[^[:space:]])" HEAD -- . || true
rg -n "(sk-[A-Za-z0-9]{12,}|LLM_API_KEY=.*[A-Za-z0-9]{20,}|GITHUB_CLIENT_SECRET=.*[^[:space:]]|SMTP_PASS=.*[^[:space:]])" -g '!node_modules' -g '!apps/api/.env' -g '!*.log' . || true
```

If either command prints a real secret, stop and remove it before continuing.

## 2. Fresh Clone Setup

Use this flow when another machine or another agent starts from GitHub.

```bash
git clone https://github.com/Usernames686/SAgent.git
cd SAgent
pnpm install
cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env`.

Minimum useful local settings:

```env
PORT=4001
NODE_ENV=development
CORS_ORIGIN=http://localhost:4000
FRONTEND_URL=http://localhost:4000

JWT_SECRET=replace-with-local-dev-secret
JWT_REFRESH_SECRET=replace-with-local-refresh-secret

LLM_API_KEY=
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-v4-pro
LLM_TIMEOUT_MS=60000
LLM_MAX_TOKENS=4096
VIBE_LLM_TIMEOUT_MS=60000
VIBE_REVIEW_TIMEOUT_MS=12000

SANDBOX_MODE=auto
SANDBOX_DOCKER_IMAGE=node:18-alpine
SANDBOX_TIMEOUT_MS=10000
SANDBOX_MAX_MEMORY_KB=262144
```

If the user wants real cloud AI behavior, they must provide their own `LLM_API_KEY` locally or through deployment environment variables. Do not place it in Git.

## 3. Local Development Run

From repository root:

```bash
pnpm dev
```

Or run services separately:

```bash
pnpm --filter @sagent/api dev
pnpm --filter @sagent/web dev
```

Expected services:

- API: `http://localhost:4001/api/v1`
- Swagger: `http://localhost:4001/docs`
- Web: `http://localhost:4000`

Verify:

```bash
curl -s http://localhost:4001/api/v1/health
curl -sI http://localhost:4000 | head -1
```

If the API port is occupied:

```bash
lsof -nP -iTCP:4001 -sTCP:LISTEN
kill <PID>
pnpm --filter @sagent/api dev
```

If the Web port is occupied:

```bash
lsof -nP -iTCP:4000 -sTCP:LISTEN
kill <PID>
pnpm --filter @sagent/web dev
```

## 4. Quality Gates Before Deployment

Run these from repository root:

```bash
pnpm --filter @sagent/api typecheck
pnpm --filter @sagent/web typecheck
pnpm --filter @sagent/api build
pnpm --filter @sagent/web build
```

Known note:

- `pnpm build` may build all workspace packages. If it fails, run app-level builds above to isolate API vs Web errors.
- Do not deploy if typecheck fails.

## 5. GitHub Upload / Update Flow

Use this when source changes need to be pushed.

```bash
git status --short --branch
git add .
git status --short --branch
git commit -m "Describe the change"
git push origin main
```

For first-time repository initialization only:

```bash
git init
git branch -M main
git remote add origin https://github.com/Usernames686/SAgent.git
git add .
git commit -m "Initial sAgent upload"
git push -u origin main
```

After push:

```bash
git rev-parse --short HEAD
git ls-remote --heads origin main
```

Expected: local commit hash matches remote `refs/heads/main`.

## 6. Docker Compose Deployment

Use Docker Compose when the target machine has Docker installed and the user wants containerized services.

Prerequisites:

```bash
docker --version
docker compose version
```

Create a root `.env` on the deployment machine:

```env
POSTGRES_PASSWORD=replace-with-strong-password
JWT_SECRET=replace-with-strong-jwt-secret
JWT_REFRESH_SECRET=replace-with-strong-refresh-secret
FRONTEND_URL=http://localhost:4000
NEXT_PUBLIC_API_URL=http://localhost:4001/api/v1

# Optional cloud model. Do not commit this file.
LLM_API_KEY=
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-v4-pro
```

Important: current `docker-compose.yml` should pass `LLM_API_KEY`, `LLM_BASE_URL`, and `LLM_MODEL` to the API container. If it only passes legacy `OPENAI_API_KEY` variables, update compose before deploying:

```yaml
environment:
  LLM_API_KEY: ${LLM_API_KEY}
  LLM_BASE_URL: ${LLM_BASE_URL:-https://api.deepseek.com}
  LLM_MODEL: ${LLM_MODEL:-deepseek-v4-pro}
```

Start:

```bash
docker compose up -d --build
docker compose ps
```

Verify:

```bash
curl -s http://localhost:4001/api/v1/health
curl -sI http://localhost:4000 | head -1
docker compose logs --tail=100 api
docker compose logs --tail=100 web
```

Stop:

```bash
docker compose down
```

Stop and remove volumes:

```bash
docker compose down -v
```

Only remove volumes when user explicitly accepts data loss.

## 7. VPS / Bare-Metal Deployment With Systemd

Use this flow when deploying to a Linux server without Docker.

Server prerequisites:

```bash
node -v
npm -v
pnpm -v
git --version
```

Install Node.js 20 and pnpm if missing.

Clone/update:

```bash
mkdir -p /opt
cd /opt
git clone https://github.com/Usernames686/SAgent.git sagent
cd /opt/sagent
pnpm install --frozen-lockfile || pnpm install
```

Create API production env:

```bash
cat > /opt/sagent/apps/api/.env.production <<'EOF'
PORT=4001
NODE_ENV=production
CORS_ORIGIN=http://YOUR_DOMAIN_OR_IP
FRONTEND_URL=http://YOUR_DOMAIN_OR_IP

JWT_SECRET=replace-with-strong-jwt-secret
JWT_REFRESH_SECRET=replace-with-strong-refresh-secret

LLM_API_KEY=
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-v4-pro
LLM_TIMEOUT_MS=60000
LLM_MAX_TOKENS=4096
VIBE_LLM_TIMEOUT_MS=60000
VIBE_REVIEW_TIMEOUT_MS=12000

SANDBOX_MODE=auto
SANDBOX_DOCKER_IMAGE=node:18-alpine
SANDBOX_TIMEOUT_MS=10000
SANDBOX_MAX_MEMORY_KB=262144
EOF
```

Create Web production env:

```bash
cat > /opt/sagent/apps/web/.env.production <<'EOF'
NEXT_PUBLIC_API_URL=/api/v1
EOF
```

Build:

```bash
cd /opt/sagent/apps/api
pnpm build

cd /opt/sagent/apps/web
NEXT_PUBLIC_API_URL=/api/v1 pnpm build
```

Create systemd API service:

```bash
cat > /etc/systemd/system/sagent-api.service <<'EOF'
[Unit]
Description=sAgent API Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/sagent/apps/api
ExecStart=/usr/bin/node dist/main
Restart=always
RestartSec=5
Environment=NODE_ENV=production
EnvironmentFile=/opt/sagent/apps/api/.env.production

[Install]
WantedBy=multi-user.target
EOF
```

Create systemd Web service:

```bash
cat > /etc/systemd/system/sagent-web.service <<'EOF'
[Unit]
Description=sAgent Web Server
After=network.target sagent-api.service

[Service]
Type=simple
WorkingDirectory=/opt/sagent/apps/web
ExecStart=/usr/bin/pnpm start -p 4000
Restart=always
RestartSec=5
Environment=NODE_ENV=production
EnvironmentFile=/opt/sagent/apps/web/.env.production

[Install]
WantedBy=multi-user.target
EOF
```

Start services:

```bash
systemctl daemon-reload
systemctl enable sagent-api sagent-web
systemctl restart sagent-api sagent-web
systemctl status sagent-api --no-pager
systemctl status sagent-web --no-pager
```

Verify:

```bash
curl -s http://localhost:4001/api/v1/health
curl -sI http://localhost:4000 | head -1
journalctl -u sagent-api -n 100 --no-pager
journalctl -u sagent-web -n 100 --no-pager
```

## 8. Reverse Proxy With Caddy

Use Caddy to expose Web and API under one domain.

Example Caddyfile:

```caddyfile
YOUR_DOMAIN_OR_IP {
    reverse_proxy localhost:4000

    handle_path /api/* {
        reverse_proxy localhost:4001
    }

    handle_path /docs* {
        reverse_proxy localhost:4001
    }
}
```

Apply:

```bash
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy || systemctl restart caddy
```

Verify:

```bash
curl -sI http://YOUR_DOMAIN_OR_IP | head -1
curl -s http://YOUR_DOMAIN_OR_IP/api/v1/health
curl -sI http://YOUR_DOMAIN_OR_IP/docs | head -1
```

Production note:

- Swagger docs are disabled when `NODE_ENV=production` in `apps/api/src/main.ts`.
- If `/docs` is required publicly, change `NODE_ENV` or modify the API code intentionally.

## 9. Existing Deploy Scripts

The repository contains:

- `deploy.sh`
- `remote_deploy.py`
- `full_deploy.py`

Agent rules for these scripts:

- Treat them as helpers, not the source of truth.
- Read the script before running it.
- Never add real passwords or API keys into these scripts.
- `remote_deploy.py` and `full_deploy.py` expect `SAGENT_SSH_PASSWORD` from environment.
- Deployment scripts expect `LLM_API_KEY` from environment if cloud model support is needed.

Example:

```bash
export SAGENT_SSH_PASSWORD='server-password-from-user'
export LLM_API_KEY='deepseek-key-from-user'
python3 remote_deploy.py
```

Do not run remote deployment scripts unless the user explicitly asks to deploy to that server.

## 10. API Key Handling For End Users

If a user asks "why does the downloaded package not include an API key", answer:

- The source package intentionally does not include real API keys.
- They must create `apps/api/.env` from `apps/api/.env.example`.
- They must place their own `LLM_API_KEY` there.
- Public repositories must not contain real keys.

Local key setup:

```bash
cp apps/api/.env.example apps/api/.env
```

Then edit:

```env
LLM_API_KEY=your_deepseek_key
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-v4-pro
```

Restart API after editing:

```bash
pnpm --filter @sagent/api dev
```

## 11. Smoke Test Checklist

After any deploy, verify in this order:

1. API process is listening.

```bash
lsof -nP -iTCP:4001 -sTCP:LISTEN || true
```

2. Web process is listening.

```bash
lsof -nP -iTCP:4000 -sTCP:LISTEN || true
```

3. API health responds.

```bash
curl -s http://localhost:4001/api/v1/health
```

4. Web loads.

```bash
curl -sI http://localhost:4000 | head -1
```

5. Browser verification:

- Open `http://localhost:4000`.
- Register or log in.
- Check dashboard.
- Open `/dashboard/interview`; generate questions.
- Open `/dashboard/projects`; verify project list and detail panel.
- Open `/dashboard/vibe`; verify AI output or fallback behavior.

6. Check logs for fatal errors:

```bash
journalctl -u sagent-api -n 100 --no-pager || true
journalctl -u sagent-web -n 100 --no-pager || true
docker compose logs --tail=100 api || true
docker compose logs --tail=100 web || true
```

## 12. Common Failures And Fixes

### Port already in use

```bash
lsof -nP -iTCP:4001 -sTCP:LISTEN
kill <PID>
```

Then restart API.

### Web cannot call API

Check:

- `NEXT_PUBLIC_API_URL`
- API `CORS_ORIGIN`
- Caddy `/api/*` reverse proxy
- Browser console network errors

Local expected:

```env
CORS_ORIGIN=http://localhost:4000
NEXT_PUBLIC_API_URL=http://localhost:4001/api/v1
```

Production behind reverse proxy:

```env
NEXT_PUBLIC_API_URL=/api/v1
CORS_ORIGIN=http://YOUR_DOMAIN_OR_IP
```

### AI features return configuration error

Check `apps/api/.env` or server env:

```env
LLM_API_KEY=...
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-v4-pro
```

Restart API after changing env.

### Docker code sandbox fails

If Docker is unavailable, set:

```env
SANDBOX_MODE=process
```

If Docker is available:

```bash
docker pull node:18-alpine
```

### Build fails because dependencies are missing

```bash
pnpm install
pnpm --filter @sagent/api typecheck
pnpm --filter @sagent/web typecheck
```

### GitHub zip looks incomplete

GitHub source zip will not include:

- `.git`
- `node_modules`
- `.env`
- local database
- build output

This is normal. The source is complete if `git ls-files` count matches the downloaded file count from the repository archive.

## 13. Recommended Agent Response When Asked To Upload Secrets

Use this exact policy:

> I cannot upload real API keys or server passwords to a public GitHub repository. I can make the project easy to run by using `.env.example`, local environment variables, deployment secrets, or a no-key demo/fallback mode.

Do not argue. Offer implementation alternatives:

- Add demo fallback mode.
- Add better `.env.example`.
- Add setup documentation.
- Add GitHub Actions secrets.
- Deploy a hosted backend where keys stay server-side.

## 14. Final Deployment Report Template

When deployment finishes, report:

```text
Deployment complete.

Source:
- Repository: https://github.com/Usernames686/SAgent
- Branch: main
- Commit: <commit-hash>

Services:
- Web: <url>
- API: <url>/api/v1
- Docs: <url>/docs, if enabled

Verification:
- API health: pass/fail
- Web HTTP status: pass/fail
- Browser smoke test: pass/fail

Notes:
- Secrets are not committed.
- LLM key is configured through environment variables.
```

