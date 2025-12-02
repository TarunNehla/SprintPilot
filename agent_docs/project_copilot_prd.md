# Project Copilot: PRD (Product Requirements Document)

## Overview

**Project Copilot** is a lightweight, Jira-like project management platform with AI agent integration, built on Cloudflare Workers, R2, Queues, and Postgres. It allows developers/teams to manage project docs and tasks, with an AI agent that can read the knowledge base and help orchestrate workflows.

**Learning Goal**: Master Cloudflare infra (Workers, R2, Queues, Postgres), RAG patterns, and multi-agent systems (Google ADK).

---

## Phase 1: MVP (Minimal Viable Product)

### Goal
Build a **functional but bare-bones** version where you can:
- Create projects, add docs/tasks, and store them (R2 + Postgres).
- Index docs for RAG (Queues + embeddings).
- Query your knowledge base via a simple RAG endpoint.
- Run a basic Google ADK agent that uses RAG to answer questions.

**Scope**: No fancy UI, no auth system yet, just API endpoints and Postgres tables. Focus on **data flow and infra**.

---

## Phase 1: MVP Feature List

### 1. Core Data Model (Postgres)

#### Tables

**users**
- `id` (UUID, PK)
- `email` (string, unique)
- `name` (string)
- `created_at` (timestamp)

**projects**
- `id` (UUID, PK)
- `owner_id` (FK → users.id)
- `name` (string)
- `description` (string, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**project_docs**
- `id` (UUID, PK)
- `project_id` (FK → projects.id)
- `title` (string)
- `doc_type` (enum: "design", "note", "retro", "other")
- `status` (enum: "active", "archived")
- `r2_key` (string) — path in R2 where raw content is stored
- `created_at` (timestamp)
- `updated_at` (timestamp)

**project_issues**
- `id` (UUID, PK)
- `project_id` (FK → projects.id)
- `title` (string)
- `status` (enum: "open", "in_progress", "done")
- `priority` (enum: "low", "medium", "high")
- `r2_key` (string) — path in R2 where full description is stored
- `created_at` (timestamp)
- `updated_at` (timestamp)

**doc_chunks** (for RAG indexing)
- `id` (UUID, PK)
- `doc_id` (FK → project_docs.id)
- `chunk_index` (int)
- `text_content` (string / text) — the actual chunk
- `embedding` (vector, via pgvector) — embedding vector
- `token_count` (int)
- `indexed_at` (timestamp)

**agent_runs** (for tracking agent executions)
- `id` (UUID, PK)
- `project_id` (FK → projects.id)
- `agent_type` (string, e.g., "question_answerer", "sprint_planner")
- `status` (enum: "pending", "running", "completed", "failed")
- `input_query` (text)
- `output` (text, nullable)
- `r2_key` (string, nullable) — full run trace stored in R2
- `created_at` (timestamp)
- `completed_at` (timestamp, nullable)

**human_feedback** (for human-in-the-loop)
- `id` (UUID, PK)
- `agent_run_id` (FK → agent_runs.id)
- `user_id` (FK → users.id)
- `decision` (enum: "approved", "rejected", "needs_edit")
- `comment` (text, nullable)
- `created_at` (timestamp)

---

### 2. Cloudflare Workers: REST API

#### Endpoints

**Projects**
- `POST /api/projects` — Create a new project
  - Body: `{ name, description, owner_id }`
  - Returns: created project object
- `GET /api/projects/:projectId` — Get project details
- `GET /api/projects` — List all projects (no filters yet)

**Docs**
- `POST /api/projects/:projectId/docs` — Create/upload a doc
  - Body: `{ title, doc_type, content }`
  - Action: Write content to R2, store metadata in Postgres, enqueue indexing job
- `GET /api/projects/:projectId/docs/:docId` — Get doc metadata
- `GET /api/projects/:projectId/docs` — List all docs in project
- `PUT /api/projects/:projectId/docs/:docId` — Update doc content
  - Action: Update R2, update Postgres, re-enqueue indexing

**Issues/Tasks**
- `POST /api/projects/:projectId/issues` — Create an issue
  - Body: `{ title, description, priority }`
  - Action: Write description to R2, store metadata in Postgres
- `GET /api/projects/:projectId/issues/:issueId` — Get issue
- `GET /api/projects/:projectId/issues` — List issues
- `PUT /api/projects/:projectId/issues/:issueId` — Update issue status/priority

**RAG Query**
- `POST /api/rag/query` — Query project knowledge base
  - Body: `{ projectId, query }`
  - Action: Hybrid search (vector + keyword) on `doc_chunks`, return top-5 chunks
  - Returns: `[ { text, docId, docTitle, similarity_score }, ... ]`

**Agent Runs**
- `POST /api/agent/run` — Trigger an agent
  - Body: `{ projectId, agent_type, query }`
  - Action: Create agent_run record, trigger ADK agent (async via Queues or direct call)
- `GET /api/agent/runs/:runId` — Get run status and output
- `POST /api/agent/runs/:runId/feedback` — Submit human feedback
  - Body: `{ decision, comment }`

---

### 3. R2 Storage Structure

```
projects/{projectId}/
  ├── docs/
  │   ├── {docId}/
  │   │   ├── v1.json          # {"title", "content", "type"}
  │   │   └── v2.json
  │   └── ...
  ├── issues/
  │   ├── {issueId}/
  │   │   └── description.json # {"title", "description"}
  │   └── ...
  └── agent-runs/
      ├── {runId}/
      │   └── trace.json       # full agent execution trace
      └── ...
```

No versioning yet in MVP — just the latest version per doc/issue.

---

### 4. Cloudflare Queues: Background Jobs

#### Queue: `doc-indexing`

**Message shape:**
```json
{
  "projectId": "proj-123",
  "docId": "doc-456",
  "r2_key": "projects/proj-123/docs/doc-456/v1.json",
  "op": "upsert" | "delete",
  "timestamp": "2025-12-01T..."
}
```

**Consumer Worker** (`indexer-worker`):
1. Fetch raw content from R2 using `r2_key`.
2. Chunk the content (simple: split on paragraphs or by token count).
3. For each chunk:
   - Call an embedding API (Cloudflare Workers AI or external, e.g., OpenAI API).
   - Store chunk record in `doc_chunks` table (Postgres).
4. Mark doc as indexed.

**Latency target**: < 30s for a typical doc.

---

### 5. RAG Layer (in Workers)

**Endpoint**: `POST /api/rag/query`

**Flow:**
1. Parse projectId and query.
2. Generate embedding for the query (using same embedding model as indexing).
3. Do vector similarity search in `doc_chunks` (Postgres + pgvector):
   ```sql
   SELECT id, text_content, embedding <-> query_embedding AS distance, doc_id
   FROM doc_chunks
   WHERE doc_chunks.doc_id IN (SELECT id FROM project_docs WHERE project_id = ?)
   ORDER BY distance ASC
   LIMIT 5;
   ```
4. (Optional, Phase 2) Do keyword/full-text search as well, blend scores.
5. Return top chunks with metadata (doc title, type, content).

**Response:**
```json
{
  "query": "how do we deploy?",
  "chunks": [
    { "text": "...", "docId": "...", "docTitle": "Deployment Guide", "score": 0.92 },
    { "text": "...", "docId": "...", "docTitle": "Architecture", "score": 0.85 }
  ]
}
```

---

### 6. Google ADK Agent Integration (Separate Service)

**Where it runs**: A small Python or Node.js backend (not on Workers, for now; can be a simple Cloud Run service or local for MVP testing). [web:28][web:35][web:37]

**Tools the agent has access to:**
- `search_project_knowledge(projectId, query)` — calls your `/api/rag/query` endpoint.
- `list_issues(projectId)` — calls `/api/projects/:projectId/issues`.
- `create_issue(projectId, title, description, priority)` — calls `/api/projects/:projectId/issues` (POST).
- `get_project_docs(projectId)` — calls `/api/projects/:projectId/docs`.

**MVP Agent Workflows (2-3 simple ones):**

1. **Question Answerer Agent**
   - User asks: "What is the deployment process?"
   - Agent: Calls `search_project_knowledge()`, retrieves chunks, calls an LLM (e.g., Gemini) to synthesize an answer from chunks.
   - Output: "Based on your docs, deployment involves: ..."

2. **Issue Summarizer Agent**
   - User asks: "Summarize all open issues by priority."
   - Agent: Calls `list_issues()`, filters for status="open", groups by priority, calls LLM to write a summary.
   - Output: "High priority (3): ..., Medium (5): ..."

3. **Sprint Planner Agent** (basic, sequential)
   - User provides: "Plan next sprint; we have 2 weeks."
   - Agent: 
     - Calls `search_project_knowledge()` to find design docs, current goals.
     - Calls `list_issues()` to see backlog.
     - Uses an LLM to propose tasks.
     - Can create new issues via `create_issue()` if needed.
   - Output: "Proposed sprint tasks: ..."

**Human-in-the-loop (MVP):**
- After agent generates plan/output, create an `agent_run` record with status="pending_approval".
- Expose `POST /api/agent/runs/:runId/feedback` to accept user approval/rejection.
- In a later phase, this can auto-execute approved plans; for MVP, it's just for tracking.

**State & Long-running tasks (MVP):**
- ADK agent runs to completion synchronously (for now).
- Store the full trace in R2 as JSON.
- Create `agent_run` record with final status and output.
- In Phase 2, move to async execution via Queues if needed.

---

### 7. Deployment & Infrastructure (MVP)

**Cloudflare Workers:**
- Deploy API Worker + Indexer Consumer Worker via `wrangler` CLI.
- Use `wrangler.toml` to define R2 bindings, Queues, and Postgres connection pool.

**Postgres:**
- Use Cloudflare Hyperdrive or a managed Postgres instance (e.g., Supabase, Railway, neon.tech).
- In `wrangler.toml`, set connection string as an environment variable.

**R2:**
- Create one bucket: `project-copilot-mvp`.
- Configure in `wrangler.toml` with a binding like `env.COPILOT_R2`.

**Queues:**
- Create one queue: `doc-indexing`.
- Configure Consumer Worker to subscribe in `wrangler.toml`.

**Embeddings Model:**
- Use Cloudflare Workers AI (built-in, free tier): `@cf/baai/bge-small-en-v1.5` or similar.
- Alternatively, call external API (OpenAI, Cohere) with API key stored as a secret.

**LLM for Agent:**
- Use Google Gemini API (free tier available).
- ADK backend calls Gemini with tool definitions.

**Minimal UI (MVP):**
- None. Everything is HTTP API.
- Test via `curl` or Postman.
- Optionally, a simple HTML form served by Workers for quick testing.

---

## Phase 1: MVP Implementation Roadmap

### Week 1: Foundation
- [ ] Set up Postgres schema (tables from above).
- [ ] Deploy API Worker with basic CRUD for projects, docs, issues.
- [ ] Set up R2 bucket and test read/write from Worker.
- [ ] Add `POST /api/projects/:projectId/docs` (writes to R2, records in Postgres).

### Week 2: Queues & Indexing
- [ ] Set up Cloudflare Queues.
- [ ] Create Indexer Consumer Worker.
- [ ] Implement chunking logic (simple paragraph split).
- [ ] Integrate embedding model (Workers AI or external API).
- [ ] Test doc indexing pipeline (doc upload → queue → chunks in Postgres).

### Week 3: RAG Layer
- [ ] Implement `POST /api/rag/query` with vector similarity search.
- [ ] Test RAG retrieval end-to-end (query → top chunks).
- [ ] Add issues CRUD endpoints.

### Week 4: Agent Integration & Polish
- [ ] Set up Google ADK backend (Python or Node.js locally).
- [ ] Implement 2–3 simple agent workflows (Question Answerer, Issue Summarizer).
- [ ] Add `POST /api/agent/run` and feedback endpoints.
- [ ] Add `agent_runs` + `human_feedback` tables.
- [ ] Test agent end-to-end (agent → calls tools → returns output).

---

## What Works in MVP

✅ Create projects, docs, issues.  
✅ Store raw content in R2, metadata in Postgres.  
✅ Async doc indexing via Queues.  
✅ Vector search on docs (RAG).  
✅ Basic multi-agent workflows (Question Answerer, Issue Summarizer, Sprint Planner).  
✅ Human-in-the-loop feedback recording.  
✅ End-to-end infra: Workers + R2 + Queues + Postgres + ADK.  

---

## What's NOT in MVP (Future Phases)

❌ User authentication & multi-tenancy enforcement (hardcode user_id for now).  
❌ Nice UI (just APIs).  
❌ Advanced RAG (hybrid search, reranking, caching).  
❌ Long-running agent tasks (e.g., multi-step workflows over hours).  
❌ Parallel agents (just sequential for now).  
❌ Agent-to-agent communication protocols.  
❌ Webhooks / real-time updates.  
❌ Analytics / observability.  
❌ Versioning of docs/issues.  

---

## Phase 2 Ideas (Post-MVP)

Once MVP is solid, you can expand:

### 2.1 Authentication & Multi-tenancy
- Add JWT auth, enforce `owner_id` on all queries.
- Per-user project isolation in RAG.

### 2.2 Hybrid Search & Caching
- Add full-text search to RAG (combine with vector search).
- Implement result caching (Cloudflare KV) + cache invalidation on doc updates.

### 2.3 Advanced Agents
- Long-running tasks: agent can schedule follow-up jobs via Queues.
- Parallel agents: spawn multiple agents for different sub-tasks, wait for all.
- Agent-to-agent: one agent calls another agent as a tool.

### 2.4 Better UI
- React SPA (or simple HTML forms) served from Workers.
- Real-time agent execution status (WebSocket or Server-Sent Events).

### 2.5 Observability & Eval
- Trace all RAG queries + agent decisions.
- Measure retrieval accuracy (Recall, MRR, NDCG).
- Dashboard showing agent performance metrics.

### 2.6 Versioning & History
- Store multiple versions of docs/issues in R2 (like Git).
- Agent can reference specific versions.

---

## Success Criteria for MVP

1. ✅ Can create a project and add 3+ docs/issues.
2. ✅ Docs are chunked and indexed automatically (via Queues).
3. ✅ RAG query returns relevant chunks in < 1 second.
4. ✅ At least 2 ADK agent workflows work end-to-end.
5. ✅ Can record human feedback on agent outputs.
6. ✅ All data persists correctly (R2, Postgres).
7. ✅ No auth required (but hardcoded user works).
8. ✅ Deployed on Cloudflare (Workers + R2 + Queues) + external Postgres.

---

## Tech Stack Summary (MVP)

| Component | Technology |
|-----------|------------|
| API & Business Logic | Cloudflare Workers (Node.js / TypeScript) |
| Object Storage | Cloudflare R2 |
| Async Jobs | Cloudflare Queues |
| Database | Postgres (external: Hyperdrive, Supabase, Railway, etc.) |
| Vector Search | pgvector extension in Postgres |
| Embeddings | Cloudflare Workers AI or external API |
| LLM | Google Gemini API |
| Multi-Agent Framework | Google Agent Development Kit (ADK) |
| ADK Backend | Python or Node.js (local or Cloud Run) |

---

## Next Steps

1. Choose a Postgres provider (Supabase, Railway, neon.tech, or local).
2. Set up schema in Postgres.
3. Scaffold Workers project with `wrangler init`.
4. Start building CRUD APIs (Week 1).
5. Test R2 read/write.
6. Build Queues pipeline (Week 2).
7. Implement RAG (Week 3).
8. Integrate Google ADK agent (Week 4).

