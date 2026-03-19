---
title: Documentation Conventions
category: meta
status: current
last_verified: 2026-03-20
---

# Documentation Conventions

This file defines how documentation is written and maintained in this project. Read this before creating or editing any doc.

## Audience

Docs are for **AI agents first**, humans second. Optimize for machine parsing: consistent structure, dense content, explicit context. Agents need to quickly find relevant information and understand the reasoning behind decisions.

## Frontmatter (mandatory)

Every doc must have YAML frontmatter at the top:

```yaml
---
title: <document title>
category: guide | spec | decision | runbook
status: current | draft | superseded
relates_to: [list of related doc paths or issue numbers]
last_verified: YYYY-MM-DD
---
```

ADRs get additional fields:

```yaml
---
title: "ADR-NNN: <title>"
category: decision
status: accepted | superseded | deprecated
decided: YYYY-MM-DD
alternatives_considered: [list]
---
```

## Directory Structure

| Directory | Contains | Pattern |
|-----------|----------|---------|
| `guides/` | How to do X | Procedural, step-by-step instructions |
| `specs/` | What X is | Descriptive reference material |
| `decisions/` | Why we chose X | ADRs: context + alternatives + consequences |
| `runbooks/` | What to do when X happens | Operational procedures |

## Writing Rules

1. **Lead with the answer.** Don't build up to it. First sentence should tell the reader what this doc is about.
2. **Tables for structured data.** Ports, endpoints, config vars, feature comparisons — always use tables.
3. **Code blocks for anything runnable.** Commands, config snippets, API examples.
4. **Include the "why" alongside the "what."** Agents need reasoning context to make good downstream decisions. Don't just say "we use xelatex" — say "we use xelatex because it has native UTF-8 and OpenType font support, which pdflatex lacks."
5. **No filler.** No marketing language, no "In this document we will explore..." — be dense and direct.
6. **Concrete over abstract.** Prefer specific examples over general descriptions. Show the actual command, the actual config, the actual error message.
7. **Never duplicate information.** Reference other docs instead. If two docs say the same thing, one will go stale.

## When to Create vs Update

| Situation | Action |
|-----------|--------|
| New feature | New spec in `specs/` |
| New non-obvious technical choice | New ADR in `decisions/` |
| Setup steps changed | Update existing guide in `guides/` |
| New operational procedure | New runbook in `runbooks/` |
| Existing doc is wrong | Fix it, update `last_verified` |

## ADR Discipline

- Every non-obvious technical choice gets an ADR.
- Number sequentially (001, 002, ...).
- **Never delete an ADR.** If a decision is reversed, mark the old ADR as `status: superseded` and add a `superseded_by: decisions/NNN-new-decision.md` field. Then create the new ADR.
- ADRs must include alternatives considered with pros/cons. An ADR without alternatives is just a statement, not a decision record.

## INDEX.md Maintenance

- Every new doc must be added to `docs/INDEX.md`.
- Orphaned docs (not in INDEX.md) are a bug.
- When deleting or moving a doc, update INDEX.md in the same commit.

## Staleness

- If you're reading a doc and something is wrong, fix it immediately.
- Always update `last_verified` in frontmatter after verifying or updating content.
- Relative dates in docs are a bug. Use absolute dates (2026-03-20, not "last week").

## File Naming

- Lowercase, hyphens for spaces: `api-contract.md`, not `API_Contract.md`
- ADRs: `NNN-short-description.md` (e.g., `001-server-side-latex.md`)
- Keep names short but descriptive enough to identify content from the filename alone
