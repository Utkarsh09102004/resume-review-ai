---
title: Deployment Runbook
category: runbook
status: current
relates_to: [docker-compose.yml, docs/guides/setup.md]
last_verified: 2026-03-20
---

# Deployment Runbook

ResumeForge runs on a single VM (`genserver_utkarsh`) via Docker Compose. Deployment is triggered by push to `main` via GitHub Actions (planned), or manually.

## VM Details

| Property | Value |
|----------|-------|
| SSH alias | `genserver_utkarsh` |
| App directory | `~/resume-review-ai/` |
| Logto directory | `~/serious-shit/utilities/logto/` |
| Docker Compose | `docker-compose.yml` (production) |

## Manual Deployment

```bash
# SSH into the VM
ssh genserver_utkarsh

# Navigate to app directory
cd ~/resume-review-ai

# Pull latest code
git pull origin main

# Rebuild and restart all services
docker compose up --build -d

# Verify all services are healthy
docker compose ps

# Check logs if something is wrong
docker compose logs -f --tail=50
```

## Service Health Checks

After deployment, verify each service:

```bash
# Backend
curl http://localhost:8000/health
# Expected: {"status": "ok"}

# TeXLive (internal, but accessible within Docker network)
docker compose exec texlive curl http://localhost:3001/health
# Expected: {"status": "ok", "engine": "xelatex", ...}

# PostgreSQL
docker compose exec postgres pg_isready -U resumeforge
# Expected: accepting connections

# Frontend
curl -s http://localhost:3000 | head -1
# Expected: HTML response
```

## Rolling Back

```bash
ssh genserver_utkarsh
cd ~/resume-review-ai

# Find the commit to roll back to
git log --oneline -10

# Reset to that commit
git checkout <commit-hash>

# Rebuild
docker compose up --build -d
```

## Database Migrations

Migrations run manually, not as part of the Docker startup. After deploying code with new migrations:

```bash
ssh genserver_utkarsh
cd ~/resume-review-ai

# Run migrations inside the backend container
docker compose exec backend uv run alembic upgrade head
```

## Environment Variables

Production `.env` on the VM must include:

```bash
DB_PASSWORD=<strong-password>
AUTH_ENABLED=true
LOGTO_JWKS_URL=http://localhost:3001/oidc/jwks
LOGTO_APP_ID=<from-logto-admin>
LOGTO_APP_SECRET=<from-logto-admin>
```

## GitHub Actions (Planned)

Auto-deploy pipeline on push to `main`:

```yaml
# .github/workflows/deploy.yml
# SSH into VM → git pull → docker compose up --build -d
```

Not yet implemented. Currently manual deploys only.

## Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| Backend 503 on /api/compile | TeXLive container unhealthy | `docker compose restart texlive` |
| Backend can't connect to DB | PostgreSQL container down | `docker compose restart postgres`, then re-run migrations |
| Frontend shows blank page | Build failed | Check `docker compose logs frontend` |
| Auth 401 errors | Logto down or JWT expired | Verify Logto is running: `curl http://localhost:3001/oidc/.well-known/openid-configuration` |
