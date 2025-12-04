# Feature: Phase 2 - Complete CRUD API

## Context
Phase 1 complete (schema + R2 storage). Build production REST API with full CRUD for projects/docs/issues. Hardcode auth for MVP. Sets foundation for Phase 3 (queues + RAG). 3-4 hour scope.

## Phases

### ✅ Phase 1: Zod Schemas (45 min) DONE
- [x] Create `packages/data-ops/src/zod-schema/projects.ts`
- [x] Define project schemas (create, response)
- [x] Define doc schemas (create, update, response, withContent)
- [x] Define issue schemas (create, update, response, withDescription)
- [x] Verify export path already configured in package.json

### ✅ Phase 2: Project Routes (45 min) DONE
- [x] POST /api/projects - create with hardcoded ownerId
- [x] GET /api/projects/:projectId - get single
- [x] GET /api/projects - list all for owner
- [x] Add Zod validation + error handling (400/404/500)

### ✅ Phase 3: Doc Routes (60 min) DONE
- [x] POST /api/projects/:projectId/docs - create doc, write R2, insert DB
- [x] GET /api/projects/:projectId/docs/:docId - fetch metadata + R2 content
- [x] GET /api/projects/:projectId/docs - list all docs
- [x] PUT /api/projects/:projectId/docs/:docId - update R2 + DB
- [x] Validate project exists on create

### ✅ Phase 4: Issue Routes (60 min) DONE
- [x] POST /api/projects/:projectId/issues - create issue, write R2, insert DB
- [x] GET /api/projects/:projectId/issues/:issueId - fetch metadata + R2 description
- [x] GET /api/projects/:projectId/issues - list all issues
- [x] PUT /api/projects/:projectId/issues/:issueId - update R2 + DB status/priority
- [x] Default status="open", priority="medium"

### ✅ Phase 5: Test & Verify (30 min) DONE
- [x] Update test-api.http with all 12 endpoints
- [x] Test create → list → update flow
- [x] Test error cases (404, 400, 500)
- [x] Run `pnpm run build` in data-ops package
- [x] Verify hybrid storage (DB metadata + R2 content)

## Current State
✅ Phase 1 complete: schema (4 tables, 4 enums, pgvector) + R2 storage helpers
✅ Phase 2 complete: 12 production /api/* routes with full CRUD
✅ Zod validation on all input/output
✅ Hybrid storage working (DB metadata + R2 content)
✅ Error handling (400/404/500)
✅ Type check passes (no errors)

## Next Steps
1. Deploy data-service to Cloudflare Workers
2. Test production endpoints (update test-api.http baseUrl)
3. Plan Phase 3: Cloudflare Queues + Document Indexing
4. Plan Phase 4: RAG Query endpoint + vector search

## Blockers
None

## Key Files
- `packages/data-ops/src/zod-schema/projects.ts` - NEW validation schemas (10 schemas)
- `apps/data-service/src/hono/app.ts` - Extended from 146 to 574 lines (added 12 routes)
- `apps/data-service/test-api.http` - Updated with production routes + error tests
- `packages/data-ops/src/drizzle/schema.ts` - Reference for enums
- `packages/data-ops/src/storage/r2.ts` - R2 helpers (used by routes)

## Implementation Notes
- **Pattern**: `initDatabase(c.env.DATABASE_URL)` → `getDb()` per route
- **Hardcoded auth**: `const OWNER_ID = "8DmS1YCNa4rpnPFoU521iAxzlt7I4iZe"`
- **UUID**: `crypto.randomUUID()`
- **Validation**: `schema.parse(await c.req.json())` throws on invalid
- **R2 helpers**: Use existing putDocContent/getDocContent/putIssueDescription/getIssueDescription
- **Errors**: 400 (validation), 404 (not found), 500 (server)
- **Keep test routes**: Don't delete /test/* endpoints (useful for debugging)

## Status
✅ COMPLETE - Phase 2 CRUD API ready for production deployment

## Deliverables
- `packages/data-ops/src/zod-schema/projects.ts` - 10 Zod validation schemas
- `apps/data-service/src/hono/app.ts` - 12 production API routes (574 lines)
- `apps/data-service/test-api.http` - Complete test suite with error cases
- Type check passes ✅
- Build successful ✅

## Delete After
Phase 2 tested in production and Phase 3 begins
