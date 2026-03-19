---
title: API Contract
category: spec
status: current
relates_to: [backend/app/routes/resumes.py, backend/app/routes/compile.py, docs/specs/data-model.md]
last_verified: 2026-03-20
---

# API Contract

All endpoints are served by FastAPI at `:8000`. Frontend calls these exclusively — it never talks to PostgreSQL or TeXLive directly.

## Authentication

All `/api/*` endpoints require authentication via JWT Bearer token in the `Authorization` header.

When `AUTH_ENABLED=false` (default in dev), all requests are attributed to `dev-user`.

When enabled, the backend verifies JWTs against Logto's JWKS endpoint and extracts the `sub` claim as `user_id`.

```
Authorization: Bearer <jwt-token>
```

## Endpoints

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | None | Backend health check |

**Response:** `{"status": "ok"}`

---

### Resumes CRUD

All resume endpoints enforce ownership — a user can only see/modify their own resumes.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/resumes/` | Required | List user's resumes (ordered by `updated_at` desc) |
| `POST` | `/api/resumes/` | Required | Create resume or sub-resume |
| `GET` | `/api/resumes/{id}` | Required | Get single resume |
| `PUT` | `/api/resumes/{id}` | Required | Update resume title and/or LaTeX source |
| `DELETE` | `/api/resumes/{id}` | Required | Delete resume (cascades to sub-resumes) |

#### POST /api/resumes/

**Request body:**
```json
{
  "title": "My Resume",
  "parent_id": null,
  "latex_source": "\\documentclass{article}..."
}
```

- `title` (required): string
- `parent_id` (optional): UUID of parent resume. If set, the new resume copies the parent's `latex_source` (ignoring any `latex_source` in the request body). Parent must belong to the same user.
- `latex_source` (optional): LaTeX source. Defaults to a starter resume template if omitted and no `parent_id`.

**Response:** `201` with full resume JSON.

#### PUT /api/resumes/{id}

**Request body (all fields optional):**
```json
{
  "title": "Updated Title",
  "latex_source": "\\documentclass{article}..."
}
```

Only provided fields are updated (`exclude_unset=True`).

**Response:** `200` with updated resume JSON.

#### DELETE /api/resumes/{id}

**Response:** `204` (no content). If the resume is a main resume, all sub-resumes are cascade-deleted via the database FK constraint.

#### Resume JSON shape

```json
{
  "id": "uuid",
  "user_id": "string",
  "parent_id": "uuid | null",
  "title": "string",
  "latex_source": "string",
  "created_at": "2026-03-20T00:00:00Z",
  "updated_at": "2026-03-20T00:00:00Z"
}
```

---

### Compilation

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/compile` | Required | Compile LaTeX to PDF |

**Request body:**
```json
{
  "latex": "\\documentclass{article}\\begin{document}Hello\\end{document}"
}
```

**Success response:** `200` with `Content-Type: application/pdf` — raw PDF bytes.

**Error response:** `400` with JSON error from TeXLive:
```json
{
  "success": false,
  "message": "! Undefined control sequence.",
  "log": "full xelatex output..."
}
```

**Service unavailable:** `503` if TeXLive container is down:
```json
{
  "detail": "LaTeX compilation service unavailable"
}
```

## Error Conventions

| Status | Meaning |
|--------|---------|
| `200` | Success |
| `201` | Created |
| `204` | Deleted (no content) |
| `400` | Bad request / LaTeX compilation error |
| `401` | Missing or invalid JWT |
| `404` | Resume not found (or not owned by user) |
| `503` | TeXLive service unavailable |

## Internal: TeXLive API (not public)

FastAPI proxies compilation to the TeXLive container on the internal Docker network.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `http://texlive:3001/compile` | Accepts `{ latex }`, returns PDF or error |
| `GET` | `http://texlive:3001/health` | Returns `{ status, engine, version }` |

This API is never exposed externally. See ADR-005.
