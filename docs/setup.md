# Development Setup Guide

## Prerequisites

- **Docker** & **Docker Compose** (for PostgreSQL + TeXLive)
- **Node.js 20+** and **npm** (for frontend)
- **Python 3.11+** and **uv** (for backend)
- **SSH access** to `genserver_utkarsh` (for Logto auth, optional)

## Architecture Overview

```
Browser (Next.js :3000)
    │
    ▼
FastAPI (:8000)          ← single backend, all API calls
    ├── PostgreSQL (:5434)   ← resume data (internal)
    └── TeXLive (:3001)      ← LaTeX → PDF compilation (internal)

Logto (external, on VM)  ← auth (OIDC), optional for dev
```

## Quick Start

### 1. Clone and configure

```bash
git clone https://github.com/Utkarsh09102004/resume-review-ai.git
cd resume-review-ai
cp .env.example .env
```

### 2. Start infrastructure containers

```bash
docker compose -f docker-compose.dev.yml up -d
```

This starts:
- **PostgreSQL 16** on port `5434` (mapped from container's 5432)
- **TeXLive compiler** on port `3001` (xelatex with Node.js Express wrapper)

Verify they're healthy:
```bash
docker compose -f docker-compose.dev.yml ps
curl http://localhost:3001/health
```

### 3. Backend

```bash
cd backend
uv sync                    # install Python dependencies
uv run alembic upgrade head # run database migrations
AUTH_ENABLED=false uv run uvicorn app.main:app --reload --port 8000
```

- API docs at http://localhost:8000/docs (Swagger UI)
- Health check: `curl http://localhost:8000/health`

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

- App at http://localhost:3000
- Uses Next.js 15 with Turbopack for fast HMR

## Port Map

| Service    | Port | Notes                                    |
|------------|------|------------------------------------------|
| Frontend   | 3000 | Next.js dev server                       |
| Backend    | 8000 | FastAPI with hot reload                  |
| TeXLive    | 3001 | LaTeX compiler (Docker)                  |
| PostgreSQL | 5434 | Mapped to avoid conflict with host pg    |

## Auth (Logto)

Auth is **disabled by default** for local development (`AUTH_ENABLED=false`). All API requests use `dev-user` as the user ID.

To enable Logto auth:

1. SSH tunnel to the VM:
   ```bash
   ssh -L 3001:localhost:3001 -L 3002:localhost:3002 genserver_utkarsh
   ```
   > Note: This conflicts with the TeXLive port. Either stop TeXLive or remap the tunnel.

2. Set environment variables:
   ```bash
   AUTH_ENABLED=true
   LOGTO_ENDPOINT=http://localhost:3001
   LOGTO_APP_ID=<your-app-id>
   LOGTO_APP_SECRET=<your-app-secret>
   LOGTO_JWKS_URL=http://localhost:3001/oidc/jwks
   ```

3. Logto admin console: http://localhost:3002

## Database

- **Engine:** PostgreSQL 16 (Alpine)
- **Connection:** `postgresql+asyncpg://resumeforge:devpassword@localhost:5434/resumeforge`
- **Migrations:** Alembic (async)

### Running migrations
```bash
cd backend
uv run alembic upgrade head     # apply all migrations
uv run alembic downgrade -1     # rollback last migration
uv run alembic revision --autogenerate -m "description"  # generate new migration
```

### Schema

```
resumes
├── id            UUID (PK)
├── user_id       VARCHAR (indexed, from JWT sub claim)
├── parent_id     UUID (FK → resumes.id, CASCADE, nullable)
├── title         VARCHAR
├── latex_source  TEXT
├── created_at    TIMESTAMP WITH TZ
└── updated_at    TIMESTAMP WITH TZ
```

- `parent_id = null` → main resume
- `parent_id = <uuid>` → sub-resume (forked copy)
- Deleting a main resume cascades to all sub-resumes

## TeXLive Compiler

The TeXLive container runs `xelatex` inside Docker. It's an Express.js server that:

- Accepts LaTeX source via `POST /compile`
- Runs `xelatex` twice (for cross-references)
- Returns PDF bytes on success, structured error JSON on failure
- Uses `--no-shell-escape` to prevent command injection
- 15-second timeout per compilation pass
- Runs as non-root `compiler` user

### Testing compilation directly
```bash
# Valid LaTeX
curl -X POST http://localhost:3001/compile \
  -H "Content-Type: application/json" \
  -d '{"latex":"\\documentclass{article}\\begin{document}Hello\\end{document}"}' \
  --output test.pdf

# Invalid LaTeX (returns error JSON)
curl -X POST http://localhost:3001/compile \
  -H "Content-Type: application/json" \
  -d '{"latex":"\\documentclass{article}\\begin{document}\\badcmd\\end{document}"}'
```

## API Endpoints

| Method   | Endpoint             | Purpose                          |
|----------|----------------------|----------------------------------|
| `GET`    | `/health`            | Backend health check             |
| `GET`    | `/api/resumes/`      | List user's resumes              |
| `POST`   | `/api/resumes/`      | Create resume (or sub-resume)    |
| `GET`    | `/api/resumes/{id}`  | Get single resume                |
| `PUT`    | `/api/resumes/{id}`  | Update resume                    |
| `DELETE` | `/api/resumes/{id}`  | Delete resume (cascades subs)    |
| `POST`   | `/api/compile`       | Compile LaTeX → PDF via proxy    |

## Production Deployment

```bash
cp .env.example .env   # edit with production values
docker compose up --build -d
```

This runs all 4 services (frontend, backend, postgres, texlive) with:
- Internal network for postgres + texlive (not exposed)
- Health checks on all services
- Auto-restart on failure

## Troubleshooting

**Port 5432/5433 already in use:**
An SSH tunnel or local PostgreSQL may be using these ports. The dev compose maps to 5434 to avoid this. Check with `lsof -i :5432`.

**TeXLive permission denied on /tmp/latex-compile:**
The tmpfs mount needs `uid=1001,gid=1001` to match the container's `compiler` user. This is already configured in the compose files.

**Alembic "No module named 'app'":**
Run alembic from the `backend/` directory. The `prepend_sys_path = .` in `alembic.ini` handles the module path.

**Frontend build fails:**
Make sure you're using Node 20+. Run `npm install` first.
