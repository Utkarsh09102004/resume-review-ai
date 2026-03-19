---
title: "ADR-006: Store LaTeX only, no PDF storage"
category: decision
status: accepted
decided: 2026-03-19
alternatives_considered: [store PDFs in S3, cache compiled PDFs, store both]
---

# ADR-006: Store LaTeX only, no PDF storage

## Context
Each resume has LaTeX source that compiles to a PDF. We could store both, or just the source and compile on demand.

## Decision
Store only `latex_source` in the database. PDFs are compiled on-demand when the user opens the editor or downloads. No file storage, no S3, no caching.

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| **LaTeX only, compile on-demand** (chosen) | No storage costs, no cache invalidation, source is always truth | Compilation on every view (~1-2s) |
| Store PDFs in S3/filesystem | Instant PDF load after first compile | Storage costs, cache invalidation when source changes, sync complexity |
| Cache compiled PDFs (Redis/disk) | Fast repeat access | Cache invalidation on every edit, memory usage, complexity |
| Store both in database | Simple, single source of truth | Bloated database, still need invalidation |

## Consequences
- Zero storage infrastructure beyond PostgreSQL.
- Every editor open triggers a compilation. At ~1-2s per compile, this is acceptable for a prototype.
- No stale PDF problem — the PDF always reflects the current source.
- If compilation performance becomes an issue at scale, we can add caching later without changing the data model (just add a cache layer in the compile route).
- Download PDF = compile + stream. No pre-generated files.
