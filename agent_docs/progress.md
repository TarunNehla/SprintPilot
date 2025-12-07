# Feature: Project Copilot MVP (Phases 1-4)

## Context
Complete RAG-powered project management platform: Postgres schema + R2 storage + CRUD API + async indexing pipeline + hybrid vector/keyword search. Built on Cloudflare Workers infra.

## Phases

### ✅ Phase 1: Schema + R2 Storage (DONE)
- [x] Define tables: projects, project_docs, project_issues, doc_chunks + 4 enums
- [x] Enable pgvector extension, vector(384) for bge-small-en-v1.5 embeddings
- [x] FK relations, indexes (FKs + issue_status), cascade deletes
- [x] Create R2 bucket `sprintpilot-storage-dev` with bindings
- [x] Build R2 helpers: putDocContent, getDocContent, putIssueDescription, getIssueDescription
- [x] Test routes: R2 write/read, project/doc creation

### ✅ Phase 2: CRUD API + Zod (DONE)
- [x] Create 10 Zod schemas: project/doc/issue (create, update, response, withContent)
- [x] Build 12 production endpoints: projects (3), docs (4), issues (4), doc upload (1)
- [x] Pattern: `initDatabase(c.env.DATABASE_URL)` → `getDb()`, hardcoded auth
- [x] Hybrid storage: DB metadata + R2 content (docs/issues)
- [x] Error handling: 400 validation, 404 not found, 500 server
- [x] Test suite: test-api.http with error cases

### ✅ Phase 3: Queues + Indexing (DONE)
- [x] Create Cloudflare Queue `doc-indexing`, configure consumer (retries=3, timeout=5s)
- [x] Scaffold indexer-worker: queue consumer + AI/R2/DB bindings
- [x] Build chunking: hybrid 512-token (paragraph → sentence → hard split)
- [x] Workers AI integration: @cf/baai/bge-small-en-v1.5, batch 10 chunks/call
- [x] Consumer logic: delete-then-insert transaction, bulk insert doc_chunks
- [x] Producer: enqueue on POST/PUT docs (queue.send at lines 274, 393)

### ✅ Phase 4: RAG Hybrid Search (DONE)
- [x] Vector search: Workers AI embeddings + pgvector `<=>` operator
- [x] Keyword search: PostgreSQL tsvector + BM25 ranking
- [x] Hybrid blending: configurable weight (0=keyword, 1=vector, 0.5=balanced)
- [x] Filters: docType, status, dateRange with pagination
- [x] Analytics: rag_queries table (track latency, result count, top queries)
- [x] Endpoints: `POST /api/rag/query`, `GET /api/rag/analytics/:projectId`
- [x] Migration: rag_queries table, text_tsv GENERATED column + GIN index
- [x] Deployment: AI binding configured, live on production

### ✅ Phase 5: ADK Agent Service (DONE)
- [x] Tools: `api_client.py` with 8 functions (search, docs CRUD, issues CRUD)
- [x] Agent: `my_agent` configured
- [x] Configuration: `PROJECT_ID_DEFAULT`, optional `project_id` in tools
- [x] Logic: Updated system instructions to fully utilize available tools

### ✅ Phase 6: Backend Authentication (DONE)
- [x] Integrate `better-auth` tables locally for `auth_session` and `auth_user`
- [x] Implement "Stateless" Manual Bearer Token Validation middleware in Hono
- [x] Secure all 14 endpoints (verify token exists + verify project ownership)
- [x] Replace `HARDCODED_OWNER_ID` with dynamic `c.get('user').id`
- [x] Clean up configuration: Remove unused `better-auth` standard config (`baseURL`, `secret`) from backend to Rely purely on DB state
- [x] Verify Cross-Origin (Localhost Frontend -> Cloudflare Backend) functionality

## Current State
✅ Auth: Backend Secured via Manual DB Token Validation (Stateless Bearer implementation aligned with Better Auth schema)
✅ Schema: 4 domain tables (projects, project_docs, project_issues, doc_chunks), 2 analytics tables (rag_queries)
✅ Storage: R2 hybrid model (DB metadata + R2 content at `projects/{projectId}/{type}s/{id}/v1.json`)
✅ API: 14 production endpoints (3 projects, 4 docs, 4 issues, 2 RAG, 1 upload) - **ALL PROTECTED**
✅ Indexing: Async pipeline via Cloudflare Queues (512-token chunks, 384-dim embeddings)
✅ Search: Hybrid vector+keyword with filters, ~200ms query latency
✅ Deployed: data-service + indexer-worker live on Cloudflare Workers

## Next Steps
1. Build multi-agent orchestration (agents consume `/api/rag/query`)
2. Refine Frontend UI (TanStack Start + React 19)
3. Optional: Reranking, semantic cache, result diversification


## Blockers
None

## Key Files
- `packages/data-ops/src/drizzle/schema.ts` - 6 tables, 4 enums, vector(384), text_tsv
- `packages/data-ops/src/drizzle/relations.ts` - FK relations
- `packages/data-ops/src/storage/r2.ts` - R2 CRUD helpers
- `packages/data-ops/src/queries/rag.ts` - Hybrid search logic
- `packages/data-ops/src/zod-schema/{projects,queues,rag}.ts` - Validation schemas
- `apps/data-service/src/hono/app.ts` - 14 API routes (574 lines)
- `apps/data-service/wrangler.jsonc` - R2 + Queue producer + AI bindings
- `apps/indexer-worker/src/index.ts` - Queue consumer
- `apps/indexer-worker/src/utils/chunking.ts` - 512-token chunking
- `apps/indexer-worker/wrangler.jsonc` - Consumer config (AI, R2, DB, Queue)
- `test-api.http` - Complete REST client test suite

## Delete After
Phase 5 (multi-agent) complete and tested
