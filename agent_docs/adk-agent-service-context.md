# Google ADK Agent Service - Integration Context

## API Base URL
```
Production: https://data-service.<your-workers-domain>.workers.dev
Local Dev: http://localhost:8787
```

## Authentication
**MVP**: No auth required. Hardcoded `ownerId = "8DmS1YCNa4rpnPFoU521iAxzlt7I4iZe"` for all requests.

**Future**: JWT/session-based auth with `Authorization: Bearer <token>` header.

---

## Available API Endpoints

### Projects
```http
GET /api/projects
→ Returns: { id, ownerId, name, description, createdAt, updatedAt }[]

GET /api/projects/:projectId
→ Returns: { id, ownerId, name, description, createdAt, updatedAt }

POST /api/projects
Body: { name: string, description?: string }
→ Returns: project object
```

### Documents
```http
GET /api/projects/:projectId/docs
→ Returns: { id, projectId, title, docType, status, r2Key, createdAt, updatedAt }[]

GET /api/projects/:projectId/docs/:docId
→ Returns: { id, projectId, title, docType, status, r2Key, content, createdAt, updatedAt }

POST /api/projects/:projectId/docs
Body: FormData with file upload OR { title?: string, docType?: "design"|"note"|"retro"|"other" }
→ Returns: doc object

PUT /api/projects/:projectId/docs/:docId
Body: { title: string, docType, content: string, status?: "active"|"archived" }
→ Returns: updated doc object
```

### Issues/Tasks
```http
GET /api/projects/:projectId/issues
→ Returns: { id, projectId, title, status, priority, r2Key, createdAt, updatedAt }[]

GET /api/projects/:projectId/issues/:issueId
→ Returns: { id, projectId, title, status, priority, r2Key, description, createdAt, updatedAt }

POST /api/projects/:projectId/issues
Body: { title: string, description: string, priority?: "low"|"medium"|"high" }
→ Returns: issue object (default: status="open", priority="medium")

PUT /api/projects/:projectId/issues/:issueId
Body: { title: string, description: string, status?: "open"|"in_progress"|"done", priority?: string }
→ Returns: updated issue object
```

### RAG Search (Most Important for Agents)
```http
POST /api/rag/query
Body: {
  projectId: string,
  query: string,
  filters?: {
    docTypes?: ("design"|"note"|"retro"|"other")[],
    statuses?: ("active"|"archived")[],
    dateRange?: { from: string, to: string }
  },
  config?: {
    limit?: number (1-100, default 10),
    offset?: number (default 0),
    hybridWeight?: number (0-1, default 0.5), // 0=keyword, 1=vector, 0.5=balanced
    topK?: number (1-50, default 20)
  }
}

→ Returns: {
  results: [{
    chunkId: string,
    docId: string,
    docTitle: string,
    textContent: string,
    score: number,
    retrievalMethod: "vector"|"keyword"|"hybrid"
  }],
  metadata: {
    totalResults: number,
    queryTime: number (ms)
  }
}
```

### Analytics
```http
GET /api/rag/analytics/:projectId
→ Returns: {
  projectId: string,
  totalQueries: number,
  avgLatency: number,
  topQueries: [{ query: string, count: number }],
  avgResultsPerQuery: number
}
```

---

## Data Models (for Agent Understanding)

### Project
```typescript
{
  id: string (UUID),
  ownerId: string,
  name: string,
  description?: string,
  createdAt: Date,
  updatedAt: Date
}
```

### Document
```typescript
{
  id: string (UUID),
  projectId: string,
  title: string,
  docType: "design" | "note" | "retro" | "other",
  status: "active" | "archived",
  r2Key: string, // Internal R2 storage path
  content: string, // Only in GET with :docId
  createdAt: Date,
  updatedAt: Date
}
```

### Issue
```typescript
{
  id: string (UUID),
  projectId: string,
  title: string,
  status: "open" | "in_progress" | "done",
  priority: "low" | "medium" | "high",
  r2Key: string, // Internal R2 storage path
  description: string, // Only in GET with :issueId
  createdAt: Date,
  updatedAt: Date
}
```

---

## Agent Tools (Python Functions to Implement)

### 1. `search_project_knowledge(project_id: str, query: str, **kwargs) -> dict`
**Purpose**: Semantic + keyword search across project docs
**API**: `POST /api/rag/query`
**Use Case**: "What's our deployment process?", "Find design decisions about auth"

**Example**:
```python
def search_project_knowledge(project_id: str, query: str, doc_types=None, limit=10):
    payload = {
        "projectId": project_id,
        "query": query,
        "filters": {"docTypes": doc_types} if doc_types else None,
        "config": {"limit": limit, "hybridWeight": 0.5}
    }
    response = requests.post(f"{API_BASE}/api/rag/query", json=payload)
    return response.json()
```

---

### 2. `list_project_docs(project_id: str) -> list[dict]`
**Purpose**: Get all docs metadata (no content)
**API**: `GET /api/projects/:projectId/docs`
**Use Case**: "List all design docs", "Show me all active notes"

---

### 3. `get_doc_content(project_id: str, doc_id: str) -> dict`
**Purpose**: Read full document content
**API**: `GET /api/projects/:projectId/docs/:docId`
**Use Case**: When agent needs full context of a specific doc

---

### 4. `list_issues(project_id: str, status: str = None) -> list[dict]`
**Purpose**: Get all issues (filter by status if needed)
**API**: `GET /api/projects/:projectId/issues`
**Use Case**: "Show open tasks", "List high priority issues"

**Example**:
```python
def list_issues(project_id: str, status=None):
    response = requests.get(f"{API_BASE}/api/projects/{project_id}/issues")
    issues = response.json()
    if status:
        return [i for i in issues if i["status"] == status]
    return issues
```

---

### 5. `get_issue_details(project_id: str, issue_id: str) -> dict`
**Purpose**: Get full issue with description
**API**: `GET /api/projects/:projectId/issues/:issueId`
**Use Case**: Read full task description

---

### 6. `create_issue(project_id: str, title: str, description: str, priority: str = "medium") -> dict`
**Purpose**: Create new task/issue
**API**: `POST /api/projects/:projectId/issues`
**Use Case**: Agent proposes new tasks during sprint planning

---

### 7. `update_issue_status(project_id: str, issue_id: str, status: str, **kwargs) -> dict`
**Purpose**: Update issue status/priority
**API**: `PUT /api/projects/:projectId/issues/:issueId`
**Use Case**: Mark tasks as done, change priority

---

### 8. `get_project_info(project_id: str) -> dict`
**Purpose**: Get project metadata
**API**: `GET /api/projects/:projectId`
**Use Case**: Understand project context

---

## Agent Workflows (From PRD)

### Workflow 1: Question Answerer
**Input**: User query about project
**Process**:
1. Call `search_project_knowledge(project_id, query)`
2. Extract top 5 chunks
3. Use LLM (Gemini) to synthesize answer from chunks
4. Return formatted answer

**Example**: "What is our deployment process?" → RAG search → LLM synthesis → "Based on docs, deployment involves..."

---

### Workflow 2: Issue Summarizer
**Input**: "Summarize open issues"
**Process**:
1. Call `list_issues(project_id, status="open")`
2. Group by priority (high/medium/low)
3. Use LLM to summarize each group
4. Return structured summary

**Output**: "High priority (3): Auth bug, DB migration, API redesign. Medium (5): ..."

---

### Workflow 3: Sprint Planner (Sequential Multi-step)
**Input**: "Plan next 2-week sprint"
**Process**:
1. Call `search_project_knowledge(project_id, "roadmap goals design")` → Get context
2. Call `list_issues(project_id, status="open")` → Get backlog
3. LLM analyzes: project goals + backlog → proposes sprint tasks
4. For each proposed task: Call `create_issue(project_id, title, description, priority)`
5. Return created issues as sprint plan

**Output**: "Created 8 sprint tasks: [task1, task2, ...]"

---

### Workflow 4: Doc Insight Agent (Advanced)
**Input**: "Analyze all design docs and find inconsistencies"
**Process**:
1. Call `list_project_docs(project_id)` → Filter docType="design"
2. For each doc: Call `get_doc_content(project_id, doc_id)`
3. LLM analyzes all docs → Identifies conflicts/gaps
4. Return analysis report

---

## Agent State Management

### Option A: Stateless (MVP)
- Each agent call is independent
- No conversation history
- Simpler implementation

### Option B: Stateful (Future)
- Track conversation history per user/project
- Use ADK's state management
- Store agent_runs in backend (see PRD tables: `agent_runs`, `human_feedback`)

**For MVP**: Start stateless, add tables later.

---

## Human-in-the-Loop (Future)

**Tables** (not implemented yet, reference from PRD):
```sql
agent_runs {
  id, project_id, agent_type, status, input_query, output, r2_key, created_at, completed_at
}

human_feedback {
  id, agent_run_id, user_id, decision (approved|rejected|needs_edit), comment, created_at
}
```

**Flow**:
1. Agent completes task → Create `agent_run` record with `status="pending_approval"`
2. User reviews → `POST /api/agent/runs/:runId/feedback` (NOT implemented yet)
3. If approved → Execute proposed changes

---

## Tech Stack for ADK Service

```python
# Python dependencies
google-adk          # Google Agent Development Kit
requests            # HTTP client for API calls
python-dotenv       # Environment variables

# Recommended structure
adk-agent-service/
├── main.py              # FastAPI/Flask server
├── agents/
│   ├── question_answerer.py
│   ├── issue_summarizer.py
│   └── sprint_planner.py
├── tools/
│   └── api_client.py    # All 8 tool functions
├── config.py            # API_BASE, secrets
└── requirements.txt
```

---

## Environment Variables

```bash
# .env file
API_BASE_URL=http://localhost:8787  # or production URL
GEMINI_API_KEY=<your-key>
PROJECT_ID_DEFAULT=<test-project-uuid>  # For testing
```

---

## Error Handling

**API Errors**:
- `400`: Validation error (check request body schema)
- `404`: Resource not found (projectId, docId, issueId invalid)
- `500`: Server error (retry or log)

**Agent Retry Logic**: Implement exponential backoff for API failures.

---

## Testing Checklist

- [ ] Test each tool function independently
- [ ] Run Question Answerer with real project data
- [ ] Run Issue Summarizer with 5+ issues
- [ ] Test Sprint Planner (ensure it creates issues correctly)
- [ ] Verify RAG search returns relevant chunks (not random)
- [ ] Test with empty project (no docs) → graceful handling

---

## Next Steps

1. Set up Python project with google-adk
2. Implement 8 tool functions in `tools/api_client.py`
3. Build Question Answerer agent (simplest workflow)
4. Test with real project data
5. Add Issue Summarizer
6. Add Sprint Planner (multi-step workflow)
7. Deploy as FastAPI service (Cloud Run or local)

---

## Questions to Clarify

1. **Agent hosting**: Local dev only or deploy to Cloud Run/GCP?
2. **LLM choice**: Gemini 1.5 Flash (fast) or Pro (better quality)?
3. **Conversation history**: Store in-memory or persist to DB?
4. **Rate limits**: Expected QPS for agent calls?
5. **Future tables**: Should we implement `agent_runs` + `human_feedback` now or later?
