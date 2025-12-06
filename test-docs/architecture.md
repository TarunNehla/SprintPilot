# System Architecture

This document describes the overall system architecture.

## Tech Stack

- **Frontend**: TanStack Start + React 19
- **Backend**: Hono.js on Cloudflare Workers
- **Database**: Neon Postgres with pgvector
- **Storage**: Cloudflare R2 for docs
- **Queues**: Cloudflare Queues for async processing

## Components

### Data Service
- REST API endpoints for CRUD operations
- Document indexing queue consumer
- RAG search with hybrid search capabilities

### User Application
- React 19 frontend with TanStack Start
- Real-time updates with TanStack Query
