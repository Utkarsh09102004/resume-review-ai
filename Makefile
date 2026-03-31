# ── ResumeForge — setup, lint & type-check ─────────────────────────

.PHONY: setup install-backend install-frontend lint lint-backend lint-frontend typecheck typecheck-backend typecheck-frontend build build-frontend fmt check test test-backend test-frontend test-cov run-mcp

# ── Individual targets ──────────────────────────────────────────────

install-backend:
	cd backend && uv sync

install-frontend:
	cd frontend && npm ci

lint-backend:
	cd backend && uv run ruff check .

lint-frontend:
	cd frontend && npm run lint

typecheck-backend:
	cd backend && uv run mypy app/ mcp_server.py

run-mcp:
	cd backend && set -a && { [ -f ../.env ] && . ../.env || true; } && set +a && uv run python mcp_server.py

typecheck-frontend:
	cd frontend && npm run typecheck

build-frontend:
	cd frontend && npm run build

fmt:
	cd backend && uv run ruff format . && uv run ruff check --fix .

# ── Aggregate targets ──────────────────────────────────────────────

setup: install-backend install-frontend

lint: lint-backend lint-frontend

typecheck: typecheck-backend typecheck-frontend

build: build-frontend

# `next build` is currently blocked by an upstream Next.js 16 prerender bug on
# internal `/_global-error` and `/_not-found` routes. Keep `build` available as
# a separate reproduction target without blocking the shared `check` gate.
check: lint typecheck

# ── Test targets ──────────────────────────────────────────────────

test-backend:
	cd backend && uv run pytest tests/ -v --tb=short

test-frontend:
	cd frontend && npm test

test: test-backend test-frontend

test-cov:
	cd backend && uv run pytest tests/ --cov=app --cov-report=term-missing
