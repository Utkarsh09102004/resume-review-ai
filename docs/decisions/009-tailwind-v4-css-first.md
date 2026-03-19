---
title: "ADR-009: Tailwind v4 CSS-first configuration"
category: decision
status: accepted
decided: 2026-03-19
alternatives_considered: [Tailwind v3 with JS config, CSS Modules, styled-components]
---

# ADR-009: Tailwind v4 CSS-first configuration

## Context
The frontend needs a styling solution. Tailwind CSS v4 was released with a fundamentally different configuration approach — CSS-first using `@theme` directives instead of `tailwind.config.ts`.

## Decision
Use Tailwind v4 with CSS-first configuration. All theme tokens (colors, fonts) defined in `frontend/app/globals.css` via `@theme {}` block. No `tailwind.config.ts` file. PostCSS uses `@tailwindcss/postcss` plugin.

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| **Tailwind v4 CSS-first** (chosen) | No config file, 70% smaller CSS output, native CSS cascade layers, theme in CSS | Newer, some v3 patterns don't apply |
| Tailwind v3 with JS config | Mature, huge community, many examples | Config file needed, larger output, being superseded |
| CSS Modules | Scoped by default, no runtime | Verbose, no utility-first, poor DX for rapid prototyping |
| styled-components | Component-level, dynamic styles | Runtime CSS-in-JS cost, hydration issues with SSR |

## Consequences
- Theme colors are defined once in `globals.css` and available as both Tailwind classes (`text-accent-amber`) and CSS custom properties (`var(--accent-amber)`).
- No `tailwind.config.ts` to maintain — one less file, one less abstraction layer.
- Production CSS is ~70% smaller than equivalent v3 output.
- Some v3 documentation and Stack Overflow answers don't apply directly — must reference v4 docs.
- `@tailwindcss/postcss` replaces the old `tailwindcss` PostCSS plugin.
