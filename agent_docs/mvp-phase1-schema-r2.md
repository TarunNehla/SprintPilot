# Feature: Core Database Schema + R2 Storage

## Context
MVP foundation: project domain tables (projects, docs, issues, chunks) + R2 content storage. Learning Cloudflare infra (Workers, R2) + Postgres pgvector. 3-5 hour chunk.

## Phases

### ⏳ Phase 1: Database Schema (90 min) (TODO)
- [ ] Define enums: doc_type, doc_status, issue_status, issue_priority
- [ ] Define tables: projects, project_docs, project_issues, doc_chunks
- [ ] Add indexes on FKs + issue status
- [ ] Define relations (auth_user→projects, projects→docs/issues, docs→chunks)
- [ ] Update drizzle.config.ts schema array

### ⏳ Phase 2: pgvector + Migration (45 min) (TODO)
- [ ] Enable pgvector in Neon: `CREATE EXTENSION IF NOT EXISTS vector;`
- [ ] Run drizzle:generate
- [ ] Review SQL (enums, FK cascades, vector(384))
- [ ] Run drizzle:migrate
- [ ] Verify in Neon console

### ⏳ Phase 3: R2 Setup (45 min) (TODO)
- [ ] Create bucket: sprintpilot-storage-dev
- [ ] Add R2 binding to data-service/wrangler.jsonc
- [ ] Create storage/r2.ts helpers (putDocContent, getDocContent, putIssueDescription, getIssueDescription)
- [ ] Add storage/* export to data-ops package.json

### ⏳ Phase 4: Test & Verify (60 min) (TODO)
- [ ] Test routes in data-service: POST /test/r2/write, GET /test/r2/read/:key
- [ ] Test routes: POST /test/db/project, POST /test/db/doc
- [ ] Export schema from data-ops
- [ ] Curl tests: R2 write/read, project create, doc create
- [ ] Type check: pnpm run build

## Current State
✅ Auth (Google OAuth, Better Auth, 4 auth tables)
❌ Project tables don't exist
❌ R2 not configured
❌ pgvector not enabled

## Next Steps
1. schema.ts: define 4 tables + 4 enums
2. Enable pgvector manually in Neon
3. Generate & run migration
4. R2 bucket + binding
5. Write R2 helpers
6. Test endpoints

## Blockers
None. Decisions:
- pgEnum() for type safety
- text IDs (follow auth pattern)
- doc_chunks.embedding nullable (indexing Week 2)
- Bucket: sprintpilot-storage-dev

## Key Files
- `packages/data-ops/src/drizzle/schema.ts` - 4 tables + enums
- `packages/data-ops/src/drizzle/relations.ts` - FK relations
- `packages/data-ops/drizzle.config.ts` - add schema.ts
- `packages/data-ops/src/storage/r2.ts` - NEW: helpers
- `apps/data-service/wrangler.jsonc` - R2 binding
- `apps/data-service/src/hono/app.ts` - test routes

## Delete After
Schema working, R2 tested, merged to main
