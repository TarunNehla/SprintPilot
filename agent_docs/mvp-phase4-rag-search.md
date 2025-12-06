# Feature: Phase 4 - RAG Query Interface + Hybrid Search

## Context
Production RAG system with true semantic search: vector + keyword hybrid search. Completed in ~2.5 hours.

## Implementation Summary

### ✅ Completed (Phases 1-6)
- [x] Vector search: Workers AI embeddings + pgvector `<=>` operator
- [x] Keyword search: PostgreSQL tsvector + BM25 ranking
- [x] Hybrid blending: Configurable weight (0=keyword, 1=vector, 0.5=balanced)
- [x] Filters: docType, status, dateRange
- [x] Pagination: limit, offset
- [x] Analytics: Query tracking (latency, result count, top queries)
- [x] Endpoints: `POST /api/rag/query`, `GET /api/rag/analytics/:projectId`
- [x] Database migration: rag_queries table, text_tsv column
- [x] Deployment: AI binding, live on production

### ⏳ Future (Optional Enhancements)
- [ ] **Reranking**: Cross-encoder re-ranking (top-20 → top-10) for improved precision
- [ ] **Semantic Cache**: Cache query embeddings when repetition >20%
- [ ] **Result Diversification**: Reduce chunk duplication in results

## Database Schema
```
rag_queries {
  id: uuid, projectId: uuid, query: text, filters: jsonb,
  resultCount: int, latency: int (ms), createdAt: timestamp
}

doc_chunks {
  -- existing fields + text_tsv: tsvector (GENERATED, GIN indexed)
}
```

## API Endpoints
```
POST /api/rag/query
├─ Body: { projectId, query, filters?, config? }
├─ Response: { results: [...], metadata: { totalResults, queryTime } }
└─ Search modes: vector | keyword | hybrid (by hybridWeight)

GET /api/rag/analytics/:projectId
├─ Response: { totalQueries, avgLatency, topQueries, avgResultsPerQuery }
└─ Purpose: Monitor RAG performance
```

## Query Flow
1. Generate query embedding (Workers AI)
2. Execute vector search (pgvector) + keyword search (PostgreSQL)
3. Normalize scores (0-1 range)
4. Blend by weight: `alpha * vec_score + (1-alpha) * kw_score`
5. Merge duplicates, sort, return top-K
6. Log query asynchronously

## What We Removed (Justified)
| Item | Reason |
|------|--------|
| KV Cache | String-based caching won't work for semantic queries. Add semantic cache later with embeddings. |
| query_feedback | Wrong design - humans don't rate chunks, agents do. Feedback belongs at agent_run level (Phase 5). |

## Files Modified
- `packages/data-ops/drizzle/schema.ts` - rag_queries table, text_tsv column
- `packages/data-ops/src/queries/rag.ts` - Hybrid search logic
- `packages/data-ops/src/zod-schema/rag.ts` - Schemas
- `apps/data-service/src/hono/app.ts` - RAG endpoints
- `apps/data-service/wrangler.jsonc` - AI binding (removed KV)
- `apps/data-service/service-bindings.d.ts` - AI type

## Current State
✅ Phase 1-4 complete: TRUE RAG with vector + keyword hybrid search
⏳ Phase 5 next: Multi-agent orchestration (agents call `/api/rag/query`)

## Deployment
✅ Data-service deployed with AI binding
✅ Database migration applied
✅ Ready for Phase 5
