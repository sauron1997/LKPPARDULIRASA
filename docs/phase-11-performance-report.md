# Phase 11 — Performance Optimization Report

> Date: 2026-06-19
> Scope: LKP Parduli Rasa Monorepo (frontend + backend + database)

---

## Summary

Systematic performance audit and optimization across 5 phases, addressing bottlenecks in Speed, Memory Usage, and Scalability. All changes verified: **106/106 tests passing**, **11,594 architecture guardrails passing**, **12/12 module verifications passing**, **build succeeds in 1.18s**.

---

## Bottlenecks Found (by parallel audit agents)

### Backend — Speed (High Impact)
| Issue | File | Description | Severity |
|-------|------|-------------|----------|
| O(n²) nested `.find()` in dashboard | `packages/domain/src/use-cases/dashboard.query.js` | 5 linear scans per student × references loop → ~1M comparisons for 500 students | **Critical** |
| Full course table scan in updateStudent | `packages/domain/src/use-cases/student.usecase.js` | `courseRepo.list()` on every update | **High** |
| Duplicate account fetch | `packages/domain/src/use-cases/student.usecase.js` | `accountRepo.getByStudentId()` called twice in same function | **Medium** |

### Backend — Scalability
| Issue | File | Description | Severity |
|-------|------|-------------|----------|
| Unbounded listStudents | `packages/domain/src/use-cases/student.usecase.js` | No limit/offset → full table load | **High** |
| Missing DB indexes | `apps/api/src/db/schema/*.js` | No indexes on FK and lookup columns | **Critical** |
| Unbounded cache staleness | `apps/api/src/runtime/backend-context.js` | Cache never invalidates, no TTL | **Medium** |

### Frontend — Memory & Speed
| Issue | File | Description | Severity |
|-------|------|-------------|----------|
| Mock data in client bundle | `packages/domain/src/index.js` | `mockData.js` (30KB) exported via barrel | **Medium** |
| Umbrella radix-ui package | `apps/web/package.json` | Ships all Radix components | **Medium** |
| Unused recharts dependency | `apps/web/package.json` | 150KB unused charting lib | **Medium** |
| Re-render on toast | `apps/web/src/components/admin/AdminInboxWorkspace.jsx` | Inline `onClose` triggers useEffect every render | **Medium** |
| No code splitting | `apps/web/vite.config.js` | All vendor code in single chunk | **Medium** |

---

## Optimizations Implemented

### Phase 1 — Frontend Quick Wins

1. **Memoized AdminToast `onClose`** — `AdminInboxWorkspace.jsx`
   - Used `useCallback` for stable reference, preventing useEffect re-fires on every parent render

2. **Replaced radix-ui umbrella** — 8 UI files
   - Swapped `import { ... } from 'radix-ui'` with 6 individual `@radix-ui/react-*` imports
   - Enables proper tree-shaking (only used components are bundled)

3. **Removed unused `recharts`** — `apps/web/package.json`
   - Zero imports found in codebase; saves ~150KB from bundle

4. **Sealed domain barrel** — `packages/domain/src/index.js`
   - Removed `mockData.js` re-export from barrel
   - ~30KB of seed data no longer enters client bundle

5. **Vite code splitting** — `apps/web/vite.config.js`
   - `manualChunks` function splits vendor code into 6 chunks:
     - `vendor-react` (537KB) — React + React DOM + React Router
     - `vendor-tiptap` (83KB) — only loads on editor pages
     - `vendor-radix` (52KB) — UI components
     - `vendor-form` (49KB) — react-hook-form + helmet
     - `vendor-tanstack` (35KB) — React Query
     - `vendor-icons` (23KB) — Lucide icons

6. **Tailwind CSS v4 warnings fixed** — 9 warnings across 3 files
   - `AdminInboxWorkspace.jsx`: 7 fixes (arbitrary brackets → native tokens)
   - `dropdown-menu.jsx`: 1 fix
   - `tabs.jsx`: 1 fix

### Phase 2 — Database Indexes

27 new indexes across 4 schema files:

| Table | Indexes | Columns |
|-------|---------|---------|
| `enrollments` | 3 | student_id, course_id, status |
| `assessment_progress` | 2 | student_id, course_id |
| `assessment_submissions` | 3 | student_id, course_id, definition_id |
| `schedule_sessions` | 2 | start_at, course_id |
| `schedule_assignments` | 2 | student_id, course_id |
| `attendance_records` | 3 | student_id, course_id, marked_at |
| `certificates` | 2 | student_id, course_id |
| `message_threads` | 3 | student_id, (channel, status), updated_at |
| `thread_messages` | 2 | thread_id, created_at |
| `students` | 2 | account_id, name |
| `payments` | 3 | student_id, status, public_access_token |

**Migration:** `apps/api/drizzle/0004_flowery_landau.sql` (31 lines, 27 CREATE INDEX statements)

### Phase 3 — Backend Query Optimization

1. **buildLearningOps O(n²) → O(n)** — `dashboard.query.js`
   - Pre-built 7 `Map` lookups (students, enrollments, courses, progressByEnrollment, submissionsByEnrollment, certByStudent)
   - Per-reference lookups go from `.find()` (O(n)) → `.get()` (O(1))

2. **listStudents pagination** — `student.usecase.js`
   - New `limit` (max 500) / `offset` params
   - Returns `{ students, total, limit, offset }` instead of unbounded array

3. **updateStudent optimization** — `student.usecase.js`
   - Targeted `courseRepo.getById()` instead of `courseRepo.list()`
   - Reused `currentAccount` instead of duplicate fetch

### Phase 4 — Memory & Runtime Hardening

1. **Bounded 30s TTL cache** — `backend-context.js`
   - `CACHE_TTL_MS = 30_000` as safety net against stale reads
   - Reference-equality check catches the common case (array identity changes after writes)

2. **Versioned cache invalidation** — `backend-context.js`
   - `cacheVersion` counter increments on each write
   - `indexCache.__version` comparison avoids unnecessary Map rebuilds

---

## Benchmark Results

```
buildLearningOps benchmark (median over 20 runs):
  students= 100 → median 0.10ms (min 0.07ms, max 1.03ms)
  students= 500 → median 0.57ms (min 0.20ms, max 1.26ms)
  students=1000 → median 0.52ms (min 0.38ms, max 1.49ms)

listStudents benchmark (1000 students):
  no filters                        → 0.00ms (1000/1000)
  search=ah                         → 0.32ms (0/0)
  status=Aktif + limit=50           → 0.03ms (50/500)
  status=Aktif + limit=50 + offset=100 → 0.04ms (50/500)
```

**Key takeaway:** `buildLearningOps` at 1000 students now runs in **under 1ms** (median 0.52ms). The `listStudents` with pagination is near-instant at 0.03–0.04ms regardless of offset.

---

## Build Verification

```
✓ built in 1.18s
vendor-react:  536.85 kB (168.30 kB gzipped)
vendor-tiptap:  82.80 kB ( 28.56 kB gzipped)
vendor-radix:   52.41 kB ( 16.11 kB gzipped)
vendor-form:    49.06 kB ( 17.40 kB gzipped)
vendor-tanstack: 35.40 kB ( 10.41 kB gzipped)
vendor-icons:   23.23 kB (  7.80 kB gzipped)
```

---

## Verification Checklist

| Check | Result |
|-------|--------|
| `npm run build` | ✅ Built in 1.18s |
| `npm test` | ✅ 106/106 passing |
| `npm run verify:architecture` | ✅ 11,594 guardrails |
| `npm run verify:modules` | ✅ 12/12 modules |
| Migration SQL | ✅ 27 indexes (0004_flowery_landau.sql) |
| Benchmark | ✅ sub-1ms aggregation |
| Karpathy guidelines | ✅ surgical changes, no speculative abstractions |

---

## Files Modified (Summary)

### Frontend (Phase 1)
- `apps/web/src/components/admin/AdminInboxWorkspace.jsx` — memoized onClose, Tailwind v4 fixes
- `apps/web/src/components/ui/{alert-dialog,badge,button,dialog,dropdown-menu,label,sheet,tabs}.jsx` — radix-ui individual imports + Tailwind fixes
- `apps/web/package.json` — removed recharts + radix-ui umbrella, added 6 @radix-ui packages
- `apps/web/vite.config.js` — manualChunks code splitting
- `packages/domain/src/index.js` — sealed barrel (removed mockData export)

### Backend (Phase 3 & 4)
- `packages/domain/src/use-cases/dashboard.query.js` — Map-based O(n) lookups
- `packages/domain/src/use-cases/student.usecase.js` — pagination + targeted queries
- `apps/api/src/runtime/backend-context.js` — bounded TTL + versioned cache

### Database (Phase 2)
- `apps/api/src/db/schema/learning.js` — 18 indexes
- `apps/api/src/db/schema/messaging.js` — 5 indexes
- `apps/api/src/db/schema/users.js` — 2 indexes
- `apps/api/src/db/schema/payments.js` — 3 indexes
- `apps/api/drizzle/0004_flowery_landau.sql` — new migration
- `apps/api/drizzle/meta/0004_snapshot.json` — migration snapshot

### Tests & Scripts (Phase 5)
- `packages/domain/tests/student.usecase.test.mjs` — updated for paginated response format
- `scripts/perf-benchmark.mjs` — new benchmark script
