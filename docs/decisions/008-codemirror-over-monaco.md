---
title: "ADR-008: CodeMirror 6 over Monaco"
category: decision
status: accepted
decided: 2026-03-19
alternatives_considered: [Monaco Editor, Ace Editor, textarea]
---

# ADR-008: CodeMirror 6 over Monaco

## Context
The editor page needs a code editor component for LaTeX. Key requirements: syntax highlighting for LaTeX, good performance, reasonable bundle size, and extensibility for future features (autocomplete, error gutter marks).

## Decision
Use CodeMirror 6 with `@codemirror/lang-latex` for LaTeX syntax highlighting. Not yet implemented — planned for the editor page (#9).

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| **CodeMirror 6** (chosen) | ~50KB bundle, first-class LaTeX mode, composable extensions, mobile-friendly | Newer, smaller community than Monaco |
| Monaco Editor | VS Code engine, powerful, familiar | ~2MB bundle, overkill for single-language editor, poor mobile support |
| Ace Editor | Mature, moderate size | Aging architecture, less composable than CM6, LaTeX mode is basic |
| Plain textarea | Zero bundle size | No syntax highlighting, no line numbers, terrible UX |

## Consequences
- ~50KB vs ~2MB for Monaco — significant bundle size savings.
- `@codemirror/lang-latex` provides LaTeX-specific syntax highlighting and bracket matching.
- CodeMirror 6's extension system allows incremental feature addition (error markers, autocomplete, vim mode) without pulling in the entire kitchen sink.
- Less "out of the box" than Monaco (no built-in autocomplete, no minimap), but we don't need those for a LaTeX resume editor.
