# CLAUDE.md

## Documentation

- Read `docs/INDEX.md` for a full map of all project documentation.
- Read `docs/CLAUDE.md` for documentation writing conventions before creating or editing any doc.
- Every new doc must be added to `docs/INDEX.md`.

## Code Quality

- Run `make check` (lint + type-check for both frontend and backend) before every commit. All checks must pass.
- Backend: `ruff` for linting/formatting, `mypy --strict` for type checking. Config in `backend/pyproject.toml`.
- Frontend: `eslint` for linting, `tsc --noEmit` for type checking.
- Quick-fix formatting: `make fmt` (auto-formats backend with ruff).

## Git & GitHub

- Always use `gh-personal` (not `gh`) for all GitHub CLI operations in this codebase.
