import { z } from "zod";

// Enums matching drizzle schema
export const docTypeEnum = z.enum(["design", "note", "retro", "other"]);
export const docStatusEnum = z.enum(["active", "archived"]);
export const issueStatusEnum = z.enum(["open", "in_progress", "done"]);
export const issuePriorityEnum = z.enum(["low", "medium", "high"]);

// ===== PROJECT SCHEMAS =====

export const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

export const projectResponseSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ===== DOC SCHEMAS =====

export const createDocSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  docType: docTypeEnum.optional(),
});

export const updateDocSchema = z.object({
  title: z.string().min(1).max(300),
  docType: docTypeEnum,
  content: z.string().min(1).max(100000),
  status: docStatusEnum.optional(),
});

export const docResponseSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string(),
  docType: docTypeEnum,
  status: docStatusEnum,
  r2Key: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const docWithContentSchema = docResponseSchema.extend({
  content: z.string(),
});

// ===== ISSUE SCHEMAS =====

export const createIssueSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().min(1).max(50000),
  priority: issuePriorityEnum.optional().default("medium"),
});

export const updateIssueSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().min(1).max(50000),
  status: issueStatusEnum.optional(),
  priority: issuePriorityEnum.optional(),
});

export const issueResponseSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string(),
  status: issueStatusEnum,
  priority: issuePriorityEnum,
  r2Key: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const issueWithDescriptionSchema = issueResponseSchema.extend({
  description: z.string(),
});

// ===== TYPE EXPORTS =====
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type Project = z.infer<typeof projectResponseSchema>;

export type CreateDocInput = z.infer<typeof createDocSchema>;
export type UpdateDocInput = z.infer<typeof updateDocSchema>;
export type Document = z.infer<typeof docResponseSchema>;
export type DocumentWithContent = z.infer<typeof docWithContentSchema>;

export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;
export type Issue = z.infer<typeof issueResponseSchema>;
export type IssueWithDescription = z.infer<typeof issueWithDescriptionSchema>;
export type IssuePriority = z.infer<typeof issuePriorityEnum>;
export type IssueStatus = z.infer<typeof issueStatusEnum>;
