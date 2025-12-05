# Feature: Phase 3 - Cloudflare Queues + Document Indexing

## Context
Phase 1 complete (schema + R2), Phase 2 complete (CRUD API). Build async document indexing pipeline: Cloudflare Queue → Consumer Worker → chunking → embeddings → pgvector storage. Foundation for Phase 4 (RAG). 3-4 hour scope.

## Phases

### ✅ Phase 1: Queue Configuration (30 min) DONE
- [x] Create Cloudflare Queue `doc-indexing` via wrangler
- [x] Add queue binding to data-service/wrangler.jsonc (producer)
- [x] Create packages/data-ops/src/zod-schema/queues.ts for message schema
- [x] Update data-service/service-bindings.d.ts with Queue type

### ✅ Phase 2: Indexer Worker App (45 min) DONE
- [x] Create apps/indexer-worker/ directory structure
- [x] Create wrangler.jsonc with queue consumer config + AI/R2/DB bindings
- [x] Configure: max_retries=3, max_batch_timeout=5s
- [x] Create service-bindings.d.ts (Env with AI, STORAGE, DATABASE_URL, Queue)
- [x] Create package.json with dependencies (drizzle-orm, @repo/data-ops, zod)
- [x] Create src/index.ts with queue consumer handler
- [x] Add dev:indexer + deploy:indexer scripts to root package.json

### ✅ Phase 3: Chunking & Embedding Logic (60 min) DONE
- [x] Create apps/indexer-worker/src/utils/chunking.ts with 512-token chunking
- [x] Implement: paragraph split (\n\n) → sentence split → hard 512-token limit
- [x] Add token counting: ~4 chars = 1 token approximation
- [x] Integrate Workers AI: @cf/baai/bge-small-en-v1.5
- [x] Batch embeddings: 10 chunks per AI.run() call for efficiency

### ✅ Phase 4: Consumer DB Logic + Producer (60 min) DONE
- [x] Implement delete-then-insert in transaction
- [x] Implement bulk insert: db.insert(docChunks).values([...])
- [x] Update POST /api/projects/:projectId/docs (line 276) to enqueue
- [x] Update PUT /api/projects/:projectId/docs/:docId (line 400) to enqueue
- [x] Add queue binding to data-service/service-bindings.d.ts

### ⏳ Phase 5: Test & Verify (15 min)
- [ ] Test with wrangler dev --remote (queues don't run locally)
- [ ] Test: POST doc → verify queue message → verify chunks in DB
- [ ] Test: PUT doc → verify old chunks deleted, new chunks inserted
- [ ] Verify embeddings are 384-dim arrays in doc_chunks table
- [ ] Check latency: target < 30s (likely ~5-10s for 5-chunk doc)

## Current State
✅ Phase 1 complete: schema (doc_chunks table with vector(384))
✅ Phase 2 complete: 12 CRUD routes with R2 storage
✅ Phase 3 implementation complete: Queue + indexer-worker + chunking + producer
✅ Cloudflare Queue `doc-indexing` created
✅ indexer-worker app scaffolded with all logic
✅ Chunking utility (512-token hybrid strategy)
✅ Embedding integration (Workers AI bge-small-en-v1.5)
✅ API routes enqueue messages on doc create/update
⏳ Testing pending (need to run workers with --remote flag)

## Next Steps
1. Create Cloudflare Queue via wrangler CLI
2. Scaffold indexer-worker app
3. Implement chunking + embedding pipeline
4. Update data-service to enqueue on doc create/update
5. Test end-to-end indexing flow

## Blockers
None

## Key Files
**New Files:**
- `apps/indexer-worker/src/index.ts` - Queue consumer with queue() export
- `apps/indexer-worker/src/utils/chunking.ts` - 512-token chunking logic
- `apps/indexer-worker/wrangler.jsonc` - Consumer config (AI, R2, DB, Queue bindings)
- `apps/indexer-worker/service-bindings.d.ts` - Env interface
- `apps/indexer-worker/package.json` - Dependencies
- `packages/data-ops/src/zod-schema/queues.ts` - Queue message schema

**Modified Files:**
- `apps/data-service/src/hono/app.ts` - Add queue.send() at lines 274, 393
- `apps/data-service/wrangler.jsonc` - Add queue producer binding
- `apps/data-service/service-bindings.d.ts` - Add DOC_INDEXING_QUEUE to Env
- `package.json` - Add dev:indexer, deploy:indexer scripts

## Implementation Notes
- **Queue Name**: `doc-indexing` (create via `wrangler queues create doc-indexing`)
- **Message Shape**: `{ projectId, docId, r2_key, op: "upsert"|"delete", timestamp }`
- **Chunking Strategy**: Hybrid approach
  - Split by paragraphs (\n\n) first
  - If paragraph > 512 tokens → split by sentence boundaries
  - If sentence > 512 tokens → hard split at 512 tokens
  - Token count: ~4 chars = 1 token approximation
  - No overlap for MVP
- **Embedding Model**: Workers AI `@cf/baai/bge-small-en-v1.5` (384-dim, free tier, 100 req/min limit)
- **Embedding Optimization**: Batch 10 chunks per AI.run() call (max 100KB doc → ~200 chunks → 20 AI calls)
- **Update Flow**: Delete-then-insert (delete all old chunks, insert new chunks) in transaction
- **Error Handling**: Queue retries 3x with exponential backoff, log failures
- **Local Dev**: Use `wrangler dev --remote` (queues don't run locally)
- **Latency Target**: < 30s per document (typical 5-10s for 5-chunk doc)

## Delete After
Phase 3 tested in production and Phase 4 (RAG) begins
