---
title: "Design System: Ink & Amber"
category: spec
status: current
relates_to: [frontend/app/globals.css]
last_verified: 2026-03-29
---

# Design System: "Ink & Amber"

Dark, warm, refined developer-tool aesthetic.

## Colors

| Token                | Hex         | Usage                                    |
|----------------------|-------------|------------------------------------------|
| `--bg-deep`          | `#0f0f14`   | App background                           |
| `--bg-surface`       | `#16161e`   | Cards, editor, preview panels            |
| `--bg-elevated`      | `#1e1e28`   | Toolbar, dropdowns, hover states         |
| `--bg-border`        | `#2a2a3a`   | Dividers, borders                        |
| `--text-primary`     | `#e8e4df`   | Main text (warm white)                   |
| `--text-secondary`   | `#8a8696`   | Labels, placeholders, muted text         |
| `--accent-amber`     | `#e8a845`   | Primary actions, active states, logo     |
| `--accent-amber-dim` | `#e8a84520` | Amber glow/hover backgrounds             |
| `--status-success`   | `#4ade80`   | Compilation success                      |
| `--status-error`     | `#f87171`   | Compilation error, delete actions        |
| `--status-compiling` | `#e8a845`   | Compiling spinner                        |

## Tailwind v4 Usage

Colors are defined in `frontend/app/globals.css` via `@theme` block and available as Tailwind classes:

```css
@theme {
  --color-bg-deep: #0f0f14;
  --color-accent-amber: #e8a845;
  /* ... */
}
```

Use in components:
```tsx
<div className="bg-bg-surface border border-bg-border text-text-primary">
  <h1 className="text-accent-amber">ResumeForge</h1>
  <p className="text-text-secondary">Subtitle</p>
</div>
```

CSS custom properties (`:root`) are also available for non-Tailwind contexts:
```css
color: var(--accent-amber);
```

## Typography

| Context | Font            | Load Method              |
|---------|-----------------|--------------------------|
| UI      | Geist Sans      | `next/font/google`       |
| Code    | Geist Mono      | `next/font/google`       |
| Editor  | JetBrains Mono  | `next/font/google`       |

Font CSS variables:
- `--font-geist-sans` — applied to body
- `--font-geist-mono` — for code blocks
- `--font-jetbrains-mono` — for LaTeX editor (future)

## Texture

Subtle noise grain overlay on `--bg-deep` at low opacity. The dashboard now uses an inline noise layer with atmospheric haze so the texture is present without relying on a separate raster asset.

## Dashboard Semantic Tokens

Dashboard surfaces extend the base `Ink & Amber` palette instead of replacing it. Add dashboard-specific values in `frontend/app/globals.css` and consume them through semantic classes or CSS variables rather than hardcoded component values.

| Token                        | Purpose |
|-----------------------------|---------|
| `--dashboard-bg-top`        | Top canvas tone for the dashboard shell |
| `--dashboard-bg-bottom`     | Bottom canvas tone for the dashboard shell |
| `--dashboard-haze-amber`    | Restrained warm atmospheric glow |
| `--dashboard-haze-slate`    | Cool balancing haze for depth |
| `--dashboard-panel`         | Default dashboard panel surface |
| `--dashboard-panel-hover`   | Hover/focus state for interactive panels |
| `--dashboard-panel-strong`  | Featured or emphasized dashboard surface |
| `--dashboard-border-subtle` | Baseline panel and chip border |
| `--dashboard-border-strong` | Hover/focus/active border emphasis |
| `--dashboard-shadow-soft`   | Default card depth |
| `--dashboard-shadow-ambient`| Stronger featured or hover depth |
| `--dashboard-radius-panel`  | Shared panel radius |
| `--dashboard-radius-chip`   | Shared chip radius |
| `--dashboard-motion-fast`   | Quick motion timing (`160ms`) |
| `--dashboard-motion-base`   | Base motion timing (`200ms`) |

## Dashboard Surface Hierarchy

- `base canvas`: shell gradient plus restrained amber/slate haze and low-opacity noise.
- `normal panel`: `--dashboard-panel` with subtle border and soft shadow.
- `featured panel`: `--dashboard-panel-strong` or hero treatment for the main workspace and CTA.

Hover should tighten border and depth slightly. It should not create a floating-card gimmick or large positional movement.

## Dashboard Motion And Focus

- Keep dashboard transitions inside the `160ms` to `220ms` band.
- Use subtle translate and shadow shifts only; avoid layout movement and decorative looping animations.
- Button press states target roughly `scale(0.98)`.
- All dashboard motion must respect `prefers-reduced-motion`.
- Keyboard focus rings use the amber accent language and must stay visible against dark surfaces.

## Dashboard Detail Rules

- Use tabular numerals for dashboard counts, dates, and metrics.
- Keep chip radius, panel borders, dropdown panels, and scrollbars aligned with dashboard tokens.
- Avoid generic SaaS glassmorphism, bright purple accents, and multicolor mesh gradients.
