---
title: Architecture
category: spec
status: current
relates_to: [docs/specs/api-contract.md, docs/specs/data-model.md, "docs/decisions/"]
last_verified: 2026-03-20
---

# Architecture

## System Design

```
                         ┌──────────────┐
                         │   Browser     │
                         │  (Next.js)    │
                         │  :3000        │
                         └──────┬───────┘
                                │ all API calls
                                ▼
                         ┌──────────────┐
                         │   FastAPI     │
                         │   :8000      │
                         └──┬───────┬───┘
                            │       │
               internal     │       │  internal
                            ▼       ▼
                    ┌────────┐  ┌────────────┐
                    │PostgreSQL│  │  TeXLive    │
                    │  :5434  │  │  :3001      │
                    └────────┘  └────────────┘
                   (not exposed) (not exposed)

         ┌─────────────────────────────────┐
         │  Logto (external, shared)       │
         │  Auth server on VM              │
         │  :3001 (core) / :3002 (admin)   │
         └─────────────────────────────────┘
```

## Service Responsibilities

### Next.js (Frontend)
- UI only — never talks directly to PostgreSQL or TeXLive
- All data flows through FastAPI
- Auth via `@logto/next` SDK (redirect-based OIDC) — not yet integrated
- Tailwind v4 with "Ink & Amber" dark theme

### FastAPI (Backend)
- Single backend — all frontend requests route through here
- Auth middleware verifies JWTs via Logto JWKS (skippable for dev)
- Resume CRUD operations
- Proxies LaTeX compilation to TeXLive container
- Async throughout (SQLAlchemy async, httpx async)

### PostgreSQL
- App data only (resumes table)
- No auth tables — Logto manages users externally
- User identity is the `sub` claim from JWT (stored as `user_id`)

### TeXLive
- Internal microservice — not exposed externally
- Accepts LaTeX source, returns compiled PDF
- Uses `xelatex` engine (UTF-8 + OpenType font support)
- Two passes per compilation (resolves cross-references)
- Shell escape disabled for security

### Logto (Auth)
- Self-hosted OIDC provider (shared across projects)
- Deployed on VM at `~/serious-shit/utilities/logto/`
- Handles Google OAuth + email/password
- Frontend uses redirect-based OIDC flow
- Backend verifies JWTs via JWKS endpoint

## Tech Stack

| Component       | Technology                          |
|-----------------|-------------------------------------|
| Frontend        | Next.js 15, TypeScript, Tailwind v4 |
| Backend         | FastAPI, Python 3.11, SQLAlchemy 2  |
| Database        | PostgreSQL 16                       |
| LaTeX Compiler  | TeXLive (xelatex), Node.js Express  |
| Auth            | Logto v1.37.1 (self-hosted OIDC)    |
| Package Manager | uv (Python), npm (Node)             |
| Migrations      | Alembic (async)                     |

## Key Design Decisions

1. **Server-side LaTeX compilation** — simpler than client-side WASM, no 15-20MB client download
2. **xelatex engine** — UTF-8 + OpenType font support (essential for resumes)
3. **Two xelatex passes** — resolves cross-references
4. **FastAPI as single backend** — no split logic between services
5. **TeXLive internal only** — LaTeX can execute commands, must not be public
6. **Store LaTeX only** — PDFs compiled on-demand, no file storage
7. **Sub-resumes = forked copies** — one level, no sync after fork
8. **Manual save only** — no auto-save in prototype
9. **CodeMirror 6** (planned) — ~50KB vs Monaco's ~2MB

## Auth Flow

```
User visits / (unauthenticated)
  → Redirect to Logto sign-in page
  → User signs in (Google OAuth or email/password)
  → Logto redirects to /callback with auth code
  → @logto/next exchanges code for JWT
  → Redirect to /dashboard

API calls:
  → Frontend includes JWT in Authorization header
  → FastAPI middleware verifies JWT via JWKS
  → Extracts 'sub' claim as user_id
```

## Data Model

- `parent_id = null` → main resume
- `parent_id = <uuid>` → sub-resume (forked copy of parent's LaTeX at creation)
- One level only — no sub-sub-resumes
- Creating a sub-resume copies parent's `latex_source` into a new row
- No ongoing sync — parent and sub diverge independently
- Deleting a main resume cascades to all sub-resumes (FK ON DELETE CASCADE)

## Docker Networking (Production)

Two networks:
- **internal** — postgres + texlive + backend (postgres and texlive never reachable from outside)
- **public** — backend + frontend (only these expose ports)
