---
title: "ADR-001: Server-side LaTeX compilation"
category: decision
status: accepted
decided: 2026-03-19
alternatives_considered: [client-side WASM, Overleaf-style, SwiftLaTeX]
---

# ADR-001: Server-side LaTeX compilation

## Context
ResumeForge needs to compile LaTeX to PDF. This can happen on the server (Docker container running TeXLive) or in the browser (WASM-compiled TeX engine).

## Decision
Compile LaTeX server-side using a TeXLive Docker container with xelatex. The frontend sends LaTeX source to FastAPI, which proxies to the TeXLive container and returns PDF bytes.

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| **Server-side TeXLive** (chosen) | Full package support, fast (~1-2s), no client download, supports xelatex/fonts | Requires Docker, adds server cost |
| Client-side WASM (texlive.js) | No server needed, works offline | 15-20MB client download, limited packages, no xelatex, slow first compile |
| Overleaf-style (full IDE server) | Proven architecture | Massively overengineered for this project |
| SwiftLaTeX (browser WASM) | Faster than texlive.js | Limited font support, no xelatex, still large download |

## Consequences
- TeXLive Docker image is ~4GB — large but cached after first pull.
- Compilation is fast (~1-2s for a typical resume with two xelatex passes).
- Full TeXLive package support — any LaTeX package works out of the box.
- Requires the TeXLive container to be running for compilation (no offline mode).
- Security: must keep TeXLive internal-only (see ADR-005).
