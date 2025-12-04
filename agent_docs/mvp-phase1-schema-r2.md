# Feature: Core Database Schema + R2 Storage

## Context
MVP foundation: project domain tables (projects, docs, issues, chunks) + R2 content storage. Learning Cloudflare infra (Workers, R2) + Postgres pgvector. 3-5 hour chunk.

## Phases

### ✅ Phase 1: Database Schema (90 min) DONE
- [x] Define enums: doc_type, doc_status, issue_status, issue_priority
- [x] Define tables: projects, project_docs, project_issues, doc_chunks
- [x] Add indexes on FKs + issue status
- [x] Define relations (auth_user→projects, projects→docs/issues, docs→chunks)
- [x] Update drizzle.config.ts schema array

### ✅ Phase 2: pgvector + Migration (45 min) DONE
- [x] Enable pgvector in Neon: `CREATE EXTENSION IF NOT EXISTS vector;`
- [x] Run drizzle:generate
- [x] Review SQL (enums, FK cascades, vector(384))
- [x] Run drizzle:migrate
- [x] Verify in Neon console

### ✅ Phase 3: R2 Setup (45 min) DONE
- [x] Create bucket: sprintpilot-storage-dev
- [x] Add R2 binding to data-service/wrangler.jsonc
- [x] Create storage/r2.ts helpers (putDocContent, getDocContent, putIssueDescription, getIssueDescription)
- [x] Add storage/* export to data-ops package.json

### ✅ Phase 4: Test & Verify (60 min) DONE
- [x] Test routes in data-service: POST /test/r2/write, GET /test/r2/read/:key
- [x] Test routes: POST /test/db/project, POST /test/db/doc
- [x] Export schema from data-ops + drizzle export
- [x] Create test-api.http for REST client testing
- [x] Type check: pnpm run build
- [x] Add drizzle-orm to data-service dependencies
- [x] Fix DATABASE_URL env var for Workers (c.env)
- [x] Create .dev.vars for local secrets

## Current State
✅ Auth (Google OAuth, Better Auth, 4 auth tables)
✅ Project tables created (projects, project_docs, project_issues, doc_chunks)
✅ R2 bucket configured with binding
✅ pgvector enabled (384-dim vectors)

## Deliverables
- `packages/data-ops/src/drizzle/schema.ts` - 4 tables + 4 enums with customType vector
- `packages/data-ops/src/drizzle/relations.ts` - FK relations (many-to-one, one-to-many)
- `packages/data-ops/drizzle.config.ts` - schema array includes both auth + project schemas
- `packages/data-ops/src/storage/r2.ts` - R2 helpers (putDocContent, getDocContent, putIssueDescription, getIssueDescription)
- `packages/data-ops/package.json` - added drizzle/* + storage/* exports
- `apps/data-service/wrangler.jsonc` - R2 binding (STORAGE → sprintpilot-storage-dev)
- `apps/data-service/service-bindings.d.ts` - Env interface with STORAGE + DATABASE_URL
- `apps/data-service/src/hono/app.ts` - 5 test routes (R2 write/read, project create, doc create, doc read)
- `apps/data-service/test-api.http` - REST client file for testing
- `apps/data-service/.dev.vars` - local env secrets (DATABASE_URL)
- `apps/data-service/package.json` - added drizzle-orm dependency

## Key Implementation Details
- **Vector Type**: CustomType with `vector(384)` for bge-small-en-v1.5 embeddings
- **ID Pattern**: text() primary keys (follow Better Auth pattern)
- **Foreign Keys**: All cascade on delete for data consistency
- **Indexes**: On all FK columns + issue_status for query optimization
- **Env Access**: Workers use `c.env` not `process.env` for secrets
- **Database**: Uses Neon HTTP adapter via @neondatabase/serverless
- **R2 Keys**: Format `projects/{projectId}/{type}s/{id}/v1.json` per PRD

## Status
✅ COMPLETE - Schema + R2 foundation ready for CRUD API development (Phase 2)
