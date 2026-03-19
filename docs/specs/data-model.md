---
title: Data Model
category: spec
status: current
relates_to: [backend/app/models/resume.py, backend/alembic/versions/001_create_resumes_table.py, docs/specs/api-contract.md]
last_verified: 2026-03-20
---

# Data Model

PostgreSQL 16, accessed via SQLAlchemy 2.0 async with asyncpg driver. Migrations managed by Alembic.

## Schema

### resumes

```sql
CREATE TABLE resumes (
    id          UUID PRIMARY KEY,
    user_id     VARCHAR NOT NULL,       -- Logto user ID (JWT sub claim)
    parent_id   UUID REFERENCES resumes(id) ON DELETE CASCADE,
    title       VARCHAR NOT NULL,
    latex_source TEXT NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_resumes_user_id ON resumes (user_id);
```

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK, default `uuid4()` | Generated in Python, not DB |
| `user_id` | VARCHAR | NOT NULL, indexed | From JWT `sub` claim. No FK to any users table — Logto manages users externally. |
| `parent_id` | UUID | FK → `resumes.id` ON DELETE CASCADE, nullable | `null` = main resume, set = sub-resume |
| `title` | VARCHAR | NOT NULL | User-visible resume name |
| `latex_source` | TEXT | NOT NULL | Full LaTeX document source |
| `created_at` | TIMESTAMPTZ | NOT NULL, server default `NOW()` | Immutable after creation |
| `updated_at` | TIMESTAMPTZ | NOT NULL, server default `NOW()`, onupdate `NOW()` | Updated on every write via SQLAlchemy |

## Relationships

### Main resume → Sub-resumes

```
Main Resume (parent_id = NULL)
├── Sub-Resume A (parent_id = main.id)
├── Sub-Resume B (parent_id = main.id)
└── Sub-Resume C (parent_id = main.id)
```

- **One level only.** No sub-sub-resumes. The application should reject creating a sub-resume where the parent itself has a `parent_id`.
- **Forked copies.** Creating a sub-resume copies the parent's `latex_source` at creation time. After that, parent and sub diverge independently — no sync.
- **Cascade delete.** Deleting a main resume deletes all its sub-resumes via the FK `ON DELETE CASCADE`.
- **No orphan subs.** A sub-resume's parent cannot be deleted without cascading, so orphans are impossible.

## Key Design Choices

- **No users table.** User identity comes from Logto JWT. We only store the `user_id` string (Logto's `sub` claim) as a foreign reference. No local user profiles, preferences, or settings — all managed by Logto.
- **No PDF storage.** PDFs are compiled on-demand from `latex_source`. Never cached or stored. See ADR-006.
- **UUIDs generated in Python.** Using `uuid.uuid4()` as the SQLAlchemy column default, not `gen_random_uuid()` in PostgreSQL. This means the application always knows the ID before the INSERT.
- **`onupdate` handled by SQLAlchemy.** The `updated_at` column uses SQLAlchemy's `onupdate=func.now()`, which means it only updates when SQLAlchemy performs an UPDATE. Direct SQL updates bypass this. This is acceptable because all writes go through the ORM.

## Migration Files

| Migration | File | Description |
|-----------|------|-------------|
| 001 | `backend/alembic/versions/001_create_resumes_table.py` | Creates `resumes` table with all columns, FK, and index |

## Connection Details

| Environment | Connection String |
|-------------|-------------------|
| Dev (native) | `postgresql+asyncpg://resumeforge:devpassword@localhost:5434/resumeforge` |
| Docker Compose (prod) | `postgresql+asyncpg://resumeforge:<DB_PASSWORD>@postgres:5432/resumeforge` |

Dev port is 5434 (not default 5432) to avoid conflicts with SSH-tunneled PostgreSQL instances on the host.
