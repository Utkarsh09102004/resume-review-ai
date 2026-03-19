---
title: "ADR-004: Single FastAPI backend"
category: decision
status: accepted
decided: 2026-03-19
alternatives_considered: [Next.js API routes, split microservices, BFF pattern]
---

# ADR-004: Single FastAPI backend

## Context
The app needs API endpoints for resume CRUD, LaTeX compilation proxy, and auth verification. Could put API logic in Next.js API routes, in FastAPI, or split across both.

## Decision
All API logic lives in a single FastAPI backend at `:8000`. Next.js is frontend-only — no API routes. FastAPI handles auth, CRUD, and proxies compilation to TeXLive.

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| **Single FastAPI** (chosen) | One auth middleware, one place for all logic, Python ecosystem (SQLAlchemy, Alembic), clear separation | Two processes to run in dev |
| Next.js API routes | Single deployment, shared types | Can't easily verify JWTs server-side, no SQLAlchemy, mixing frontend and backend concerns |
| Split microservices | Clean separation per domain | Overkill for a prototype, complex deployment, distributed auth |
| BFF (Next.js API routes → FastAPI) | Type safety on frontend boundary | Extra hop, more complexity, two auth layers |

## Consequences
- Clear boundary: frontend is purely UI, backend is purely API.
- Single auth middleware in FastAPI — no duplicate auth logic.
- Frontend devs only need to know the API contract, not backend internals.
- Two processes in dev (Next.js + uvicorn), but docker-compose handles this in production.
- Python ecosystem for backend: SQLAlchemy async, Alembic migrations, httpx for HTTP calls.
