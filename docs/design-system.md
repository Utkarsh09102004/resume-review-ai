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

Subtle noise grain overlay on `--bg-deep` at 3-4% opacity (to be added as a `noise.png` background image).
