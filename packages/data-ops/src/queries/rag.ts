import { getDb } from "../database/setup";
import { docChunks, projectDocs, ragQueries } from "../drizzle/schema";
import { eq, and, inArray, gte, lte, sql, desc, asc } from "drizzle-orm";
import type { RagResultChunk } from "../zod-schema/rag";

export interface HybridSearchOptions {
  projectId: string;
  query: string;
  ai: Ai; // Workers AI binding
  filters?: {
    docTypes?: string[];
    statuses?: string[];
    dateRange?: {
      from: string;
      to: string;
    };
  };
  limit?: number;
  offset?: number;
  hybridWeight?: number; // 0 = pure keyword, 1 = pure vector
  topK?: number;
}

/**
 * Generate query embedding using Workers AI
 */
async function generateQueryEmbedding(query: string, ai: Ai): Promise<number[]> {
  const response = (await ai.run("@cf/baai/bge-small-en-v1.5", {
    text: [query],
  })) as any;

  // Handle Workers AI response format (data can be single array or nested)
  if (typeof response.data[0] === "number") {
    return response.data;
  }
  return response.data[0];
}

interface ChunkWithScore {
  id: string;
  docId: string;
  docTitle: string;
  textContent: string;
  score: number;
  retrievalMethod: "vector" | "keyword" | "hybrid";
}

/**
 * Perform hybrid search combining vector similarity and full-text keyword search
 */
export async function hybridSearch(
  options: HybridSearchOptions
): Promise<ChunkWithScore[]> {
  const db = getDb();
  const {
    projectId,
    query,
    ai,
    filters = {},
    limit = 10,
    offset = 0,
    hybridWeight = 0.5,
    topK = 20,
  } = options;

  // Build filter conditions
  const filterConditions = [];

  // Always filter by project
  filterConditions.push(eq(projectDocs.projectId, projectId));

  if (filters.docTypes && filters.docTypes.length > 0) {
    filterConditions.push(inArray(projectDocs.docType, filters.docTypes as any));
  }

  if (filters.statuses && filters.statuses.length > 0) {
    filterConditions.push(inArray(projectDocs.status, filters.statuses as any));
  }

  if (filters.dateRange) {
    if (filters.dateRange.from) {
      filterConditions.push(gte(projectDocs.createdAt, new Date(filters.dateRange.from)));
    }
    if (filters.dateRange.to) {
      filterConditions.push(lte(projectDocs.createdAt, new Date(filters.dateRange.to)));
    }
  }

  // If pure vector search (hybridWeight = 1)
  if (hybridWeight === 1) {
    const queryEmbedding = await generateQueryEmbedding(query, ai);

    const vectorResults = await db
      .select({
        id: docChunks.id,
        docId: docChunks.docId,
        docTitle: projectDocs.title,
        textContent: docChunks.textContent,
        score: sql<number>`1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector)`,
      })
      .from(docChunks)
      .innerJoin(projectDocs, eq(docChunks.docId, projectDocs.id))
      .where(and(...filterConditions))
      .orderBy(asc(sql`embedding <=> ${JSON.stringify(queryEmbedding)}::vector`))
      .limit(limit)
      .offset(offset);

    return vectorResults.map((r) => ({
      ...r,
      retrievalMethod: "vector" as const,
    }));
  }

  // If pure keyword search (hybridWeight = 0)
  if (hybridWeight === 0) {
    const keywordResults = await db
      .select({
        id: docChunks.id,
        docId: docChunks.docId,
        docTitle: projectDocs.title,
        textContent: docChunks.textContent,
        score: sql<number>`ts_rank(text_tsv, plainto_tsquery('english', ${query}))`,
      })
      .from(docChunks)
      .innerJoin(projectDocs, eq(docChunks.docId, projectDocs.id))
      .where(
        and(
          sql`text_tsv @@ plainto_tsquery('english', ${query})`,
          ...filterConditions
        )
      )
      .orderBy(desc(sql`ts_rank(text_tsv, plainto_tsquery('english', ${query}))`))
      .limit(limit)
      .offset(offset);

    return keywordResults.map((r) => ({
      ...r,
      retrievalMethod: "keyword" as const,
    }));
  }

  // Hybrid search: combine vector + keyword
  const queryEmbedding = await generateQueryEmbedding(query, ai);

  // Get vector results
  const vectorResults = await db
    .select({
      id: docChunks.id,
      docId: docChunks.docId,
      docTitle: projectDocs.title,
      textContent: docChunks.textContent,
      score: sql<number>`1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector)`,
    })
    .from(docChunks)
    .innerJoin(projectDocs, eq(docChunks.docId, projectDocs.id))
    .where(and(...filterConditions))
    .orderBy(asc(sql`embedding <=> ${JSON.stringify(queryEmbedding)}::vector`))
    .limit(topK);

  // Get keyword results
  const keywordResults = await db
    .select({
      id: docChunks.id,
      docId: docChunks.docId,
      docTitle: projectDocs.title,
      textContent: docChunks.textContent,
      score: sql<number>`ts_rank(text_tsv, plainto_tsquery('english', ${query}))`,
    })
    .from(docChunks)
    .innerJoin(projectDocs, eq(docChunks.docId, projectDocs.id))
    .where(
      and(
        sql`text_tsv @@ plainto_tsquery('english', ${query})`,
        ...filterConditions
      )
    )
    .orderBy(desc(sql`ts_rank(text_tsv, plainto_tsquery('english', ${query}))`))
    .limit(topK);

  // Normalize and blend scores
  const normalize = (results: any[]) => {
    if (results.length === 0) return [];
    const scores = results.map((r) => r.score);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const range = maxScore - minScore || 1;
    return results.map((r) => ({
      ...r,
      normalizedScore: (r.score - minScore) / range,
    }));
  };

  const normalizedVector = normalize(vectorResults);
  const normalizedKeyword = normalize(keywordResults);

  // Merge and blend by chunk ID
  const merged = new Map<string, ChunkWithScore>();

  normalizedVector.forEach((r) => {
    merged.set(r.id, {
      id: r.id,
      docId: r.docId,
      docTitle: r.docTitle,
      textContent: r.textContent,
      score: hybridWeight * r.normalizedScore,
      retrievalMethod: "hybrid" as const,
    });
  });

  normalizedKeyword.forEach((r) => {
    if (merged.has(r.id)) {
      const existing = merged.get(r.id)!;
      existing.score += (1 - hybridWeight) * r.normalizedScore;
    } else {
      merged.set(r.id, {
        id: r.id,
        docId: r.docId,
        docTitle: r.docTitle,
        textContent: r.textContent,
        score: (1 - hybridWeight) * r.normalizedScore,
        retrievalMethod: "hybrid" as const,
      });
    }
  });

  // Sort by blended score and return top results
  return Array.from(merged.values())
    .sort((a, b) => b.score - a.score)
    .slice(offset, offset + limit);
}

/**
 * Log RAG query to analytics table
 */
export async function logRagQuery(data: {
  projectId: string;
  query: string;
  filters: any;
  resultCount: number;
  latency: number;
}): Promise<void> {
  const db = getDb();

  await db.insert(ragQueries).values({
    id: crypto.randomUUID(),
    projectId: data.projectId,
    query: data.query,
    filters: data.filters || null,
    resultCount: data.resultCount,
    latency: data.latency,
  });
}

/**
 * Get RAG analytics for a project
 */
export async function getRagAnalytics(projectId: string) {
  const db = getDb();

  const stats = await db
    .select({
      totalQueries: sql<number>`count(*)`,
      avgLatency: sql<number>`avg(${ragQueries.latency})`,
      avgResults: sql<number>`avg(${ragQueries.resultCount})`,
    })
    .from(ragQueries)
    .where(eq(ragQueries.projectId, projectId));

  const topQueries = await db
    .select({
      query: ragQueries.query,
      count: sql<number>`count(*)`,
    })
    .from(ragQueries)
    .where(eq(ragQueries.projectId, projectId))
    .groupBy(ragQueries.query)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  return {
    projectId,
    totalQueries: Number(stats[0]?.totalQueries || 0),
    avgLatency: Number(stats[0]?.avgLatency || 0),
    topQueries: topQueries.map((q) => ({
      query: q.query,
      count: Number(q.count),
    })),
    avgResultsPerQuery: Number(stats[0]?.avgResults || 0),
  };
}
