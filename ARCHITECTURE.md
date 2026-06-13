# LKP Parduli Rasa — Architecture Reference

## Overview

This is a Node.js/Express monorepo with a clean architecture that separates domain logic,
infrastructure, and application services into distinct layers.

The original codebase had a 1736-line god module (`admin.service.js`) that handled
everything from business logic to persistence to orchestration. Phases 1–8.5 systematically
decomposed it into focused, testable, decoupled modules.

---

## Folder Structure

```
packages/domain/src/           # Domain layer (no framework dependencies)
├── entities/                  # Pure data structures
├── use-cases/                 # Business rules
│   ├── schedule.usecase.js
│   ├── attendance.usecase.js
│   ├── course.usecase.js
│   ├── student.usecase.js
│   ├── certificate.usecase.js
│   ├── dashboard.query.js
│   ├── errors.js
│   └── helpers.js
├── repositories/              # Repository interfaces (contracts only)
├── defaults.js                # Default/seed data factories
├── domainRelations.js         # Cross-entity domain logic
└── index.js

apps/api/src/
├── runtime/                   # Shared runtime context (no business logic)
│   ├── backend-context.js     # In-memory state + repository factories
│   └── errors.js              # ensure() and createServiceError()
├── modules/                   # Feature modules
│   ├── admin/
│   │   ├── admin.routes.js
│   │   └── admin.service.v2.js   # Thin orchestration via use cases
│   ├── auth/
│   ├── assessments/
│   │   ├── assessments.service.js
│   │   ├── assessments.persistence.js
│   │   └── certificates.service.js
│   ├── classroom/
│   ├── content/
│   ├── courses/
│   ├── exports/
│   ├── media/
│   ├── messages/
│   │   ├── messages.service.js
│   │   ├── messages.persistence.js
│   │   └── thread-utils.js        # normalizeThread, compareByUpdatedDesc
│   ├── payments/
│   ├── public/
│   ├── registrations/
│   └── student/
│       ├── student.service.js
│       ├── student.persistence.js
│       ├── student-portal.js       # getStudentPortal() (DB-first + fallback)
│       └── student-schedule.service.js
├── adapters/
│   └── repository-adapter.js  # Bridges in-memory repos → use-case interfaces
├── repositories/              # Drizzle ORM implementations
│   ├── student.drizzle-repo.js
│   ├── course.drizzle-repo.js
│   ├── enrollment.drizzle-repo.js
│   ├── schedule.drizzle-repo.js
│   ├── attendance.drizzle-repo.js
│   ├── certificate.drizzle-repo.js
│   ├── assessment.drizzle-repo.js
│   ├── message.drizzle-repo.js
│   └── index.js               # createRepositories() smart factory
├── db/
│   ├── client.js              # Drizzle client + requireDb()
│   └── schema/                # Drizzle table definitions
├── auth/                      # Session middleware
├── utils/                     # HTTP helpers (asyncHandler, ok, etc.)
└── app.js                     # Express app setup
```

---

## Architecture Layers

```
┌─────────────────────────────────────┐
│  Routes (Express)                   │
│  apps/api/src/modules/*/routes.js   │
├─────────────────────────────────────┤
│  Module Services (Orchestration)    │
│  apps/api/src/modules/*/*.service.js│
├─────────────────────────────────────┤
│  Use Cases (Business Logic)         │
│  packages/domain/src/use-cases/     │
├─────────────────────────────────────┤
│  Domain Entities + Repo Interfaces  │
│  packages/domain/src/               │
├─────────────────────────────────────┤
│  Infrastructure Adapters            │
│  apps/api/src/adapters/             │
│  apps/api/src/runtime/              │
├─────────────────────────────────────┤
│  Data Layer                         │
│  Drizzle ORM + PostgreSQL           │
│  apps/api/src/db/                   │
└─────────────────────────────────────┘
```

---

## Dependency Rules

These rules must be respected when adding or modifying code:

| Layer | May import from | Must NOT import from |
|---|---|---|
| Domain entities | Nothing | Any app layer |
| Use cases | Domain entities, repo interfaces | Drizzle, Express, runtime |
| Module services | `runtime/`, use cases, persistence | `admin.service.js` (deleted), `legacy-bridge.js` (deleted) |
| Routes | Module services, `utils/http.js` | Use cases directly, domain entities directly |
| Persistence modules | `db/client.js`, `db/schema/` | Module services, use cases |
| Runtime helpers | Domain defaults/relations | Module services, use cases |

---

## Runtime Mode Selection

The repository factory auto-selects the persistence mode:

```
DATABASE_URL set?
  YES → Drizzle repositories (PostgreSQL)
  NO  → In-memory adapter (dev/demo/test mode)
```

`apps/api/src/repositories/index.js` exports `createRepositories(opts)` which handles this.

---

## Key Extracted Modules (Phase 8 final)

These were extracted from the original god module and are now standalone:

| Module | Path | Responsibility |
|---|---|---|
| Backend context | `runtime/backend-context.js` | In-memory state, repo factories, index builders |
| Error helpers | `runtime/errors.js` | `ensure()`, `createServiceError()` |
| Student portal | `modules/student/student-portal.js` | `getStudentPortal()` — DB-first with fallback |
| Schedule service | `modules/student/student-schedule.service.js` | Student schedules, attendance, check-in |
| Certificates | `modules/assessments/certificates.service.js` | CRUD for student certificates |
| Thread utils | `modules/messages/thread-utils.js` | `normalizeThread()`, `compareByUpdatedDesc()` |

---

## Known Cross-Module Coupling (Acceptable)

These are documented and accepted as pragmatic choices:

- `messages.service.js` imports `public.service.js` and `student.service.js`
  (messages need student/public context to build threads)
- `public.service.js` imports `messages.persistence.js`
  (public inbox counts)
- `media.service.js` imports `content.persistence.js`
  (media assets relate to content items)

These do NOT violate the architecture — they're within the "module services" layer.

---

## Migration History

| Phase | Description | Status |
|---|---|---|
| 1 | Domain entities + repository interfaces | ✅ Done |
| 2 | Extract use cases from god module | ✅ Done |
| 3 | Create adapter, wire routes | ✅ Done |
| 4 | Dashboard aggregations → `dashboard.query.js` | ✅ Done |
| 5 | Drizzle PostgreSQL repository implementations | ✅ Done |
| 6 | Runtime repository unification (`createRepositories()`) | ✅ Done |
| 7 | Async compatibility + remove `forceInMemory` | ✅ Done |
| 8 | Module services migrated off legacy, orchestration methods extracted | ✅ Done |
| 8.5 | Hardening: legacy artifacts deleted, repo hygiene, docs polished | ✅ Done |
| 9 | Verification & boundary hardening (95 tests, 11K guardrail checks) | ✅ Done |
| 10 | Production readiness: env validation, health checks, deploy workflow | ✅ Done |

---

## Phase 8.5 — Hardening & Cleanup (COMPLETED)

Actions taken:
- `admin.service.js` archived to `docs/admin.service.legacy-reference.js` (zero runtime dependents confirmed)
- `runtime/legacy-bridge.js` deleted (was already a tombstone)
- Stray root files removed: `student.repository.js`, `_write_service.py`, `-p/`
- Scratch test file removed: `auth.service.js_test`
- Boundary audit confirmed: all 13 module services have clean imports (no legacy coupling)
- Documentation rewritten as operational reference (this file)

---

## Do / Don't for Contributors

**DO:**
- Put business rules in `packages/domain/src/use-cases/`
- Put orchestration in module `*.service.js` files
- Use `ensure()` from `runtime/errors.js` for validation
- Use `createBackendContext()` for accessing in-memory repos
- Use `createRepositories()` factory for production DB access
- Keep route files thin (HTTP translation only)

**DON'T:**
- Import from `admin.service.js` (deleted/archived)
- Import from `legacy-bridge.js` (deleted)
- Put Drizzle/Express code in domain use cases
- Create new god modules — keep services focused
- Mix persistence logic with business rules in the same function
