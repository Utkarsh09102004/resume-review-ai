# Frontend — CLAUDE.md

## Stack

- Next.js 15 (App Router, TypeScript strict)
- Tailwind v4 (CSS-first, no tailwind.config.ts)
- Geist Sans (UI), JetBrains Mono (editor)

## Skills

When creating or modifying frontend components, pages, or any React code, **always use the `/vercel-react-best-practices` skill**. This ensures optimal React and Next.js performance patterns including proper use of Server Components, data fetching, bundle optimization, and rendering strategies.

## Theme

"Ink & Amber" dark theme. Colors defined in `app/globals.css` via `@theme` block. See `docs/specs/design-system.md` for full palette.

Use Tailwind classes referencing theme colors: `bg-bg-surface`, `text-accent-amber`, `border-bg-border`, `text-text-secondary`, etc.

## API

All data fetching goes through `lib/api.ts` → FastAPI backend at `NEXT_PUBLIC_API_URL`. Never call PostgreSQL or TeXLive directly from the frontend.
