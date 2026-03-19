# ── ResumeForge — lint & type-check ─────────────────────────────────

.PHONY: lint lint-backend lint-frontend typecheck typecheck-backend typecheck-frontend fmt check test test-backend test-frontend test-cov

# ── Individual targets ──────────────────────────────────────────────

lint-backend:
	cd backend && uv run ruff check .

lint-frontend:
	cd frontend && npm run lint

typecheck-backend:
	cd backend && uv run mypy app/

typecheck-frontend:
	cd frontend && npm run typecheck

fmt:
	cd backend && uv run ruff format . && uv run ruff check --fix .

# ── Aggregate targets ──────────────────────────────────────────────

lint: lint-backend lint-frontend

typecheck: typecheck-backend typecheck-frontend

check: lint typecheck

# ── Test targets ──────────────────────────────────────────────────

test-backend:
	cd backend && uv run pytest tests/ -v --tb=short

test-frontend:
	cd frontend && npm test

test: test-backend test-frontend

test-cov:
	cd backend && uv run pytest tests/ --cov=app --cov-report=term-missing
