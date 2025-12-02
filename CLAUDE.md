# Project Overview

## Purpose
Project Copilot - AI-powered project management platform with RAG-based knowledge retrieval and multi-agent orchestration. Manages projects, docs, tasks, and provides intelligent querying via vector embeddings.

## Tech Stack
- **Runtime**: Cloudflare Workers (edge compute)
- **Frontend**: TanStack Start + React 19 + Vite
- **Backend**: Hono.js on Cloudflare Workers
- **Database**: Neon Postgres with pgvector extension
- **Storage**: Cloudflare R2 (object storage)
- **Queues**: Cloudflare Queues (async jobs)
- **Auth**: Better Auth with Google OAuth
- **ORM**: Drizzle ORM with Zod validation
- **Key Libraries**: TanStack Query, Workers AI, @neondatabase/serverless

## Project Structure
```
/apps
  /user-application - TanStack Start frontend (Cloudflare Pages)
  /data-service - Hono REST API (Cloudflare Workers)
  /indexer-worker - Document indexing consumer (Cloudflare Workers)
/packages
  /data-ops - Shared database schemas, auth, utilities, queries
/agent_docs - PRD, feature tracking, templates
```

## Working on This Project

### Setup
```bash
pnpm install
pnpm run setup  # Builds data-ops package

# Database: Create Neon project, enable pgvector, set DATABASE_URL
cd packages/data-ops
pnpm run drizzle:generate
pnpm run drizzle:migrate
```

### Development
```bash
# Frontend (http://localhost:3000)
pnpm run dev:user-application

# Backend API (http://localhost:8787)
pnpm run dev:data-service

# Indexer worker
pnpm run dev:indexer
```

### Deployment
```bash
pnpm run deploy:user-application
pnpm run deploy:data-service
pnpm run deploy:indexer
```

### Database Operations
```bash
cd packages/data-ops
pnpm run better-auth:generate  # Regenerate auth schema
pnpm run drizzle:generate      # Generate migrations
pnpm run drizzle:migrate       # Apply migrations
pnpm run drizzle:pull          # Pull schema from DB
```

### Verification
```bash
cd packages/data-ops
pnpm run build  # Type check + build

# Manual API testing via test-api.http or curl
```

## Environment Variables

### Local Development
```bash
# packages/data-ops/.env
DATABASE_URL="postgresql://user:pass@host.neon.tech/db?sslmode=require"
BETTER_AUTH_SECRET="<openssl rand -base64 32>"
GOOGLE_CLIENT_ID="<from-google-console>"
GOOGLE_CLIENT_SECRET="<from-google-console>"
```

### Cloudflare Secrets
```bash
# Set via wrangler for each app
cd apps/user-application
wrangler secret put DATABASE_URL
wrangler secret put BETTER_AUTH_SECRET
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET

cd ../data-service
wrangler secret put DATABASE_URL

cd ../indexer-worker
wrangler secret put DATABASE_URL
```

## Additional Context
For implementation details, see:
- `agent_docs/project_copilot_prd.md` - Full product requirements
- `agent_docs/project-copilot-mvp.md` - MVP phase tracking
- `.claude/plans/` - Implementation plans

## Important Notes
- **Storage**: All doc/issue content in R2, metadata in Postgres
- **Vector Search**: Uses pgvector with Workers AI embeddings (bge-small-en-v1.5, 384-dim)
- **Async Processing**: Document indexing via Cloudflare Queues
- **Auth**: Better Auth manages `auth_*` tables (do not modify manually)
- **Database**: All IDs are UUIDs (not varchar)
- **MVP**: Hardcoded test user UUID (no session middleware yet)
- **Zod**: All API request/response validation via Zod schemas
- **R2 Keys**: Format: `projects/{projectId}/{type}s/{id}/v1.json`