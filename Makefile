# ── ResumeForge — lint & type-check ─────────────────────────────────

.PHONY: lint lint-backend lint-frontend typecheck typecheck-backend typecheck-frontend fmt check

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
