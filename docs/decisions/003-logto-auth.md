---
title: "ADR-003: Logto for authentication"
category: decision
status: accepted
decided: 2026-03-19
alternatives_considered: [Clerk, Auth0, Supabase Auth, NextAuth.js]
---

# ADR-003: Logto for authentication

## Context
Need user authentication with Google OAuth and email/password. Must work with both the Next.js frontend (redirect-based sign-in) and FastAPI backend (JWT verification). Already have a VM where we can host services.

## Decision
Use Logto v1.37.1, self-hosted on the VM at `~/serious-shit/utilities/logto/`. Shared across all projects. Frontend uses `@logto/next` SDK, backend verifies JWTs via JWKS endpoint.

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| **Logto** (chosen) | Free forever (self-hosted), OIDC compliant, admin console, Google OAuth, shared across projects | Self-hosted maintenance, no managed SLA |
| Clerk | Beautiful UI, easy integration, many providers | Costs money at scale ($0.02/MAU after free tier), vendor lock-in |
| Auth0 | Enterprise-grade, huge feature set | Free tier limits (7,000 MAU), complex pricing, overkill |
| Supabase Auth | Free with Supabase, easy setup | Ties you to Supabase ecosystem, we use standalone PostgreSQL |
| NextAuth.js | Free, Next.js native | Frontend-only — no built-in way to verify JWTs in FastAPI backend, no hosted sign-in UI |

## Consequences
- Zero auth costs regardless of user count.
- OIDC/OAuth 2.1 standard — can switch providers later without changing the JWT verification logic in FastAPI.
- Must maintain the Logto instance on the VM (updates, backups).
- Currently accessed via SSH tunnel (no domain yet). Will need a domain or reverse proxy for production.
- No local user profiles table — user identity is the `sub` claim from Logto JWTs.
