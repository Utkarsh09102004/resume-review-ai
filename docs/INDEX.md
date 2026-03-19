---
title: Documentation Index
category: meta
status: current
last_verified: 2026-03-20
---

# Documentation Index

**ResumeForge** — AI-powered LaTeX resume editor. Next.js frontend, FastAPI backend, PostgreSQL, TeXLive compiler, Logto auth. Single VM deployment via Docker Compose.

## Start Here

| You want to... | Read this |
|----------------|-----------|
| Set up the dev environment | [guides/setup.md](guides/setup.md) |
| Understand the system architecture | [specs/architecture.md](specs/architecture.md) |
| Know the API endpoints | [specs/api-contract.md](specs/api-contract.md) |
| Understand the database schema | [specs/data-model.md](specs/data-model.md) |
| Use the correct colors/fonts | [specs/design-system.md](specs/design-system.md) |
| Know why a technical choice was made | [decisions/](decisions/) (ADRs) |
| Deploy to production | [runbooks/deployment.md](runbooks/deployment.md) |
| Write or edit documentation | [CLAUDE.md](CLAUDE.md) (conventions) |

## Project Status

| Component | Status | Issues |
|-----------|--------|--------|
| Architecture & Tech Stack | Done | #1 |
| Auth (Logto self-hosted) | Done | #2 |
| Bootstrap (scaffolding) | Done | #13 |
| TeXLive container | Done | #8 |
| Frontend — Editor page | To Do | #9 |
| Frontend — Pages & flows | To Do | #10 |
| Frontend — Dashboard | To Do | #11 |
| Docker Compose & Deployment | To Do | #12 |
| AI Review Pipeline | Deferred | — |

---

## Guides

| Doc | Description |
|-----|-------------|
| [guides/setup.md](guides/setup.md) | Full dev environment setup: Docker, backend, frontend, ports, Logto auth, troubleshooting |

## Specs

| Doc | Description |
|-----|-------------|
| [specs/architecture.md](specs/architecture.md) | System design, service responsibilities, tech stack, auth flow, Docker networking |
| [specs/api-contract.md](specs/api-contract.md) | All API endpoints, request/response shapes, error conventions, TeXLive internal API |
| [specs/data-model.md](specs/data-model.md) | PostgreSQL schema, resume/sub-resume relationships, migration files, connection strings |
| [specs/design-system.md](specs/design-system.md) | "Ink & Amber" color palette, typography, Tailwind v4 usage examples |

## Decisions (ADRs)

| ADR | Decision |
|-----|----------|
| [decisions/001-server-side-latex.md](decisions/001-server-side-latex.md) | Server-side LaTeX compilation over client-side WASM |
| [decisions/002-xelatex-engine.md](decisions/002-xelatex-engine.md) | xelatex over pdflatex/lualatex for UTF-8 and OpenType support |
| [decisions/003-logto-auth.md](decisions/003-logto-auth.md) | Logto (self-hosted) over Clerk, Auth0, Supabase Auth |
| [decisions/004-fastapi-single-backend.md](decisions/004-fastapi-single-backend.md) | Single FastAPI backend as sole API layer |
| [decisions/005-texlive-internal-only.md](decisions/005-texlive-internal-only.md) | TeXLive on internal Docker network only (security) |
| [decisions/006-store-latex-only.md](decisions/006-store-latex-only.md) | Store LaTeX source only, compile PDFs on-demand |
| [decisions/007-sub-resumes-forked-copies.md](decisions/007-sub-resumes-forked-copies.md) | Sub-resumes as forked copies with no sync |
| [decisions/008-codemirror-over-monaco.md](decisions/008-codemirror-over-monaco.md) | CodeMirror 6 over Monaco Editor (~50KB vs ~2MB) |
| [decisions/009-tailwind-v4-css-first.md](decisions/009-tailwind-v4-css-first.md) | Tailwind v4 CSS-first config over v3 JS config |
| [decisions/010-uv-package-manager.md](decisions/010-uv-package-manager.md) | uv over pip/poetry for Python package management |

## Runbooks

| Doc | Description |
|-----|-------------|
| [runbooks/deployment.md](runbooks/deployment.md) | Manual and CI deployment to VM, health checks, rollback, migrations |

## Meta

| Doc | Description |
|-----|-------------|
| [CLAUDE.md](CLAUDE.md) | Documentation writing conventions and philosophy for AI agents |
