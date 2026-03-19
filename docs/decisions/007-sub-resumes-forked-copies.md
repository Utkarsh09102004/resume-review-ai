---
title: "ADR-007: Sub-resumes as forked copies"
category: decision
status: accepted
decided: 2026-03-19
alternatives_considered: [linked with diff/merge, template inheritance, tags/versions]
---

# ADR-007: Sub-resumes as forked copies

## Context
Users need to create variations of a resume (e.g., "Backend Engineer" vs "Full-Stack" versions). These variations should start from the same base but diverge independently.

## Decision
Sub-resumes are simple forked copies. Creating a sub-resume copies the parent's `latex_source` into a new row with `parent_id` set. After creation, parent and sub diverge independently — no sync, no merge, no diff tracking. One level only (no sub-sub-resumes).

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| **Forked copies** (chosen) | Dead simple, no merge conflicts, users understand "copy and customize" | No way to propagate parent changes to subs |
| Linked with diff/merge | Changes to base can propagate | Merge conflicts in LaTeX are brutal, complex UX, hard to implement |
| Template inheritance | Clean separation of structure and content | Too abstract for most users, LaTeX doesn't naturally support this |
| Tags/versions on single doc | No duplication | Can't view two versions side-by-side, confusing UX |

## Consequences
- Each sub-resume is a fully independent document after creation. Editing the parent does not affect subs.
- `parent_id` is purely for UI grouping (showing subs under their parent on the dashboard) and cascade deletion.
- Deleting a main resume cascades to all sub-resumes via FK `ON DELETE CASCADE`.
- One level only — the API should reject creating a sub-resume of a sub-resume (where `parent_id` points to a resume that itself has a `parent_id`). This is not yet enforced in the current code.
- Simple mental model for users: "fork a copy, customize it."
