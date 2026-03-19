---
title: "ADR-005: TeXLive on internal network only"
category: decision
status: accepted
decided: 2026-03-19
alternatives_considered: [public endpoint with auth, API gateway]
---

# ADR-005: TeXLive on internal network only

## Context
The TeXLive container exposes a `POST /compile` endpoint that accepts arbitrary LaTeX and runs `xelatex`. LaTeX is a Turing-complete language — even with `--no-shell-escape`, xelatex can read files, consume unbounded resources, and potentially exploit engine vulnerabilities.

## Decision
TeXLive runs on Docker's `internal` network only. It is not exposed to the host or the internet. Only FastAPI (also on the internal network) can reach it at `http://texlive:3001`.

In `docker-compose.dev.yml`, TeXLive is mapped to `localhost:3001` for local testing convenience, but this is dev-only.

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| **Internal network only** (chosen) | Zero attack surface from outside, simple | Must proxy through FastAPI |
| Public endpoint with auth | Direct client access, lower latency | Exposes arbitrary code execution endpoint, auth can be bypassed |
| API gateway (Kong/Nginx) | Rate limiting, centralized auth | Complexity for no real benefit over FastAPI proxy |

## Consequences
- No external traffic can reach the TeXLive container. The compilation endpoint is completely shielded.
- FastAPI acts as the security boundary — it validates auth, then proxies to TeXLive.
- Adds ~1ms latency for the internal proxy hop (negligible vs 1-2s compilation time).
- Dev convenience: `docker-compose.dev.yml` exposes port 3001 to localhost for testing. This should never be done in production.
