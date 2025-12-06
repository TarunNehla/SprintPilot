import { z } from "zod";

// RAG Query Request Schema
export const ragQuerySchema = z.object({
  projectId: z.string().uuid(),
  query: z.string().min(1),
  filters: z
    .object({
      docTypes: z.array(z.enum(["design", "note", "retro", "other"])).optional(),
      statuses: z.array(z.enum(["active", "archived"])).optional(),
      dateRange: z
        .object({
          from: z.string().datetime(),
          to: z.string().datetime(),
        })
        .optional(),
    })
    .optional(),
  config: z
    .object({
      limit: z.number().int().min(1).max(100).default(10),
      offset: z.number().int().min(0).default(0),
      hybridWeight: z.number().min(0).max(1).default(0.5), // 0=pure keyword, 1=pure vector
      topK: z.number().int().min(1).max(50).default(20), // candidates before rerank
    })
    .optional(),
});

export type RagQueryRequest = z.infer<typeof ragQuerySchema>;

// RAG Query Response Schema
export const ragResultChunkSchema = z.object({
  chunkId: z.string(),
  docId: z.string(),
  docTitle: z.string(),
  textContent: z.string(),
  score: z.number(),
  retrievalMethod: z.enum(["vector", "keyword", "hybrid"]),
});

export const ragQueryResponseSchema = z.object({
  results: z.array(ragResultChunkSchema),
  metadata: z.object({
    totalResults: z.number(),
    queryTime: z.number(), // in milliseconds
  }),
});

export type RagResultChunk = z.infer<typeof ragResultChunkSchema>;
export type RagQueryResponse = z.infer<typeof ragQueryResponseSchema>;

// RAG Analytics Response Schema
export const ragAnalyticsSchema = z.object({
  projectId: z.string().uuid(),
  totalQueries: z.number(),
  avgLatency: z.number(),
  topQueries: z.array(
    z.object({
      query: z.string(),
      count: z.number(),
    })
  ),
  avgResultsPerQuery: z.number(),
});

export type RagAnalytics = z.infer<typeof ragAnalyticsSchema>;
