---
title: "ADR-002: xelatex engine"
category: decision
status: accepted
decided: 2026-03-19
alternatives_considered: [pdflatex, lualatex]
---

# ADR-002: xelatex engine

## Context
Multiple TeX engines are available. Resumes frequently use custom fonts (OpenType/TrueType) and non-ASCII characters (accented names, multilingual content). The engine choice affects font support, Unicode handling, and compilation speed.

## Decision
Use `xelatex` as the compilation engine. Run with `--no-shell-escape --interaction=nonstopmode` flags.

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| **xelatex** (chosen) | Native UTF-8, loads system OpenType/TrueType fonts via fontspec, widely supported | Slightly slower than pdflatex, some pdflatex-only packages don't work |
| pdflatex | Fastest, most legacy packages | No native UTF-8 (needs inputenc), no OpenType fonts, limited font selection |
| lualatex | Native UTF-8, OpenType fonts, Lua scripting | Slowest of the three, Lua overhead, less mature ecosystem |

## Consequences
- Users can use any system-installed OpenType/TrueType font via `\usepackage{fontspec}`.
- UTF-8 works natively — no need for `\usepackage[utf8]{inputenc}`.
- Two passes per compilation (for cross-references) adds ~0.5s but ensures correct output.
- Some pdflatex-specific packages (e.g., `microtype` with full features) have limited xelatex support, but this rarely affects resumes.
