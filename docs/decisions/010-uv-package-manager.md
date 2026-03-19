---
title: "ADR-010: uv for Python package management"
category: decision
status: accepted
decided: 2026-03-19
alternatives_considered: [pip + venv, poetry, pdm]
---

# ADR-010: uv for Python package management

## Context
Need a Python package manager for the FastAPI backend. Requirements: fast installs, lockfile for reproducibility, good Docker support, handles virtual environments.

## Decision
Use `uv` (by Astral, makers of ruff) for all Python package management. Single tool replaces pip, venv, and pip-tools. Lockfile via `uv.lock`.

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| **uv** (chosen) | 10-100x faster than pip, single tool (replaces pip + venv + pip-tools), excellent Docker support, `uv.lock` for reproducibility | Newer tool, smaller community |
| pip + venv | Standard, universally available | Slow installs, no lockfile without pip-tools, multiple tools to manage |
| poetry | Lockfile, dependency groups, popular | Slower than uv, custom lockfile format, resolver can be slow |
| pdm | PEP 621 compliant, fast | Smaller community than poetry, less Docker tooling |

## Consequences
- `uv sync` installs all dependencies in seconds (vs minutes with pip for large dependency trees).
- `uv.lock` provides reproducible builds across dev and production.
- Docker builds use `COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/` for a clean multi-stage copy — no curl/pip install for uv itself.
- `uv run <command>` automatically uses the project's virtual environment.
- `pyproject.toml` is the single source of truth for dependencies (standard PEP 621 format).
- Team members need uv installed locally (`curl -LsSf https://astral.sh/uv/install.sh | sh`).
