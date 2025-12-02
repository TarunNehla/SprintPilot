import { pgTable, text, timestamp, integer, pgEnum, index, customType } from "drizzle-orm/pg-core";
import { auth_user } from "./auth-schema";

// Custom vector type for pgvector (384 dimensions for bge-small-en-v1.5)
const vector = customType<{ data: number[]; notNull: false; default: false }>({
  dataType() {
    return "vector(384)";
  },
});

// Enums
export const docTypeEnum = pgEnum("doc_type", ["design", "note", "retro", "other"]);
export const docStatusEnum = pgEnum("doc_status", ["active", "archived"]);
export const issueStatusEnum = pgEnum("issue_status", ["open", "in_progress", "done"]);
export const issuePriorityEnum = pgEnum("issue_priority", ["low", "medium", "high"]);

// Projects table
export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => auth_user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Project Docs table
export const projectDocs = pgTable(
  "project_docs",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    docType: docTypeEnum("doc_type").notNull(),
    status: docStatusEnum("status").notNull().default("active"),
    r2Key: text("r2_key").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("project_docs_projectId_idx").on(table.projectId)]
);

// Project Issues table
export const projectIssues = pgTable(
  "project_issues",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    status: issueStatusEnum("status").notNull().default("open"),
    priority: issuePriorityEnum("priority").notNull().default("medium"),
    r2Key: text("r2_key").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("project_issues_projectId_idx").on(table.projectId),
    index("project_issues_status_idx").on(table.status),
  ]
);

// Doc Chunks table (for RAG)
export const docChunks = pgTable(
  "doc_chunks",
  {
    id: text("id").primaryKey(),
    docId: text("doc_id")
      .notNull()
      .references(() => projectDocs.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    textContent: text("text_content").notNull(),
    // pgvector extension: vector(384) for bge-small-en-v1.5 embeddings
    // Nullable initially since indexing happens async
    embedding: vector("embedding"),
    tokenCount: integer("token_count"),
    indexedAt: timestamp("indexed_at"),
  },
  (table) => [index("doc_chunks_docId_idx").on(table.docId)]
);
