# ResumeForge

AI-powered LaTeX resume editor with live PDF preview.

## Tech Stack

- **Frontend:** Next.js 15 (TypeScript, Tailwind v4)
- **Backend:** FastAPI (Python 3.11, SQLAlchemy, async)
- **Database:** PostgreSQL 16
- **LaTeX:** TeXLive (xelatex) in Docker
- **Auth:** Logto (self-hosted OIDC)

## Quick Start

```bash
# 1. Infrastructure (PostgreSQL + TeXLive)
docker compose -f docker-compose.dev.yml up -d

# 2. Backend
cd backend
uv sync
uv run alembic upgrade head
AUTH_ENABLED=false uv run uvicorn app.main:app --reload --port 8000

# 3. Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

Visit http://localhost:3000.

## Documentation

- **[Setup Guide](docs/setup.md)** — full dev environment setup, port map, troubleshooting
- **[Architecture](docs/architecture.md)** — system design, service responsibilities, tech stack, auth flow
- **[Design System](docs/design-system.md)** — "Ink & Amber" theme, colors, typography, Tailwind v4 usage

## Production

```bash
cp .env.example .env  # edit values
docker compose up --build -d
```
