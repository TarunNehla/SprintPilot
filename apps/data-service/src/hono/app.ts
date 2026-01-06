import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { initDatabase, getDb } from "@repo/data-ops/database/setup";
import { projects, projectDocs, projectIssues } from "@repo/data-ops/drizzle/schema";
import { auth_user, auth_session } from "@repo/data-ops/drizzle/auth-schema";
import {
  putDocContent,
  getDocContent,
  putIssueDescription,
  getIssueDescription,
} from "@repo/data-ops/storage/r2";
import {
  createProjectSchema,
  createDocSchema,
  updateDocSchema,
  createIssueSchema,
  updateIssueSchema,
} from "@repo/data-ops/zod-schema/projects";
import type { DocIndexingMessage } from "@repo/data-ops/zod-schema/queues";
import { ragQuerySchema } from "@repo/data-ops/zod-schema/rag";
import { agentQuerySchema } from "@repo/data-ops/zod-schema/agent";
import {
  hybridSearch,
  logRagQuery,
  getRagAnalytics,
} from "@repo/data-ops/queries/rag";
import { cors } from 'hono/cors'


// Max file size: 2MB
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB in bytes

// Helper: Infer doc type from file extension
function inferDocType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const typeMap: Record<string, string> = {
    md: "note",
    markdown: "note",
    txt: "note",
    json: "other",
    pdf: "other",
  };
  return typeMap[ext] || "other";
}




export const app = new Hono<{
  Bindings: Env,
  Variables: {
    user: typeof auth_user.$inferSelect;
    session: typeof auth_session.$inferSelect;
    agentRequest: boolean;
    agentUserId: string;
  }
}>();

app.use('/*', cors())

// Database initialization middleware
app.use("*", async (c, next) => {
  initDatabase(c.env.DATABASE_URL);
  await next();
});

// Auth Middleware (Validator)
// Auth Middleware (Validator)
const authMiddleware = async (c: any, next: any) => {
  const token = c.req.raw.headers.get("Authorization")?.replace("Bearer ", "");
  
  if (token) {
      const db = getDb();
      const [session] = await db.select().from(auth_session).where(eq(auth_session.token, token)).limit(1);
      
      if (session) {
         if (new Date(session.expiresAt) > new Date()) {
             const [user] = await db.select().from(auth_user).where(eq(auth_user.id, session.userId)).limit(1);
             if (user) {
                 c.set("user", user);
                 c.set("session", session);
                 await next();
                 return;
             }
         }
      }
  }

  return c.json({ error: "Unauthorized" }, 401);
};

// Agent Service Auth Middleware
const agentServiceAuthMiddleware = async (c: any, next: any) => {
  const secret = c.req.raw.headers.get("X-Agent-Secret");

  if (!secret) {
    return c.json({ error: "Missing agent secret" }, 401);
  }

  if (secret.trim() !== c.env.AGENT_SERVICE_SECRET.trim()) {
    return c.json({ error: "Invalid agent secret" }, 403);
  }

  // Extract user context from agent request
  const userId = c.req.raw.headers.get("X-User-Id");
  c.set("agentRequest", true);
  c.set("agentUserId", userId);

  await next();
};

// Dual Auth Middleware (accepts both user and agent auth)
const dualAuthMiddleware = async (c: any, next: any) => {
  // Check for agent secret first
  const agentSecret = c.req.raw.headers.get("X-Agent-Secret");

  if (agentSecret) {
    // Agent authentication path
    return agentServiceAuthMiddleware(c, next);
  }

  // User authentication path
  return authMiddleware(c, next);
};

// Auth Middleware


app.get("/", (c) => {
  return c.text("Hello World");
});

// Test R2 write
app.post("/test/r2/write", async (c) => {
  try {
    const { key, content } = await c.req.json();
    const bucket = c.env.STORAGE;

    await bucket.put(key, JSON.stringify(content), {
      httpMetadata: {
        contentType: "application/json",
      },
    });

    return c.json({ success: true, key });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Test R2 read
app.get("/test/r2/read/:key{.+}", async (c) => {
  try {
    const key = c.req.param("key");
    const bucket = c.env.STORAGE;

    const object = await bucket.get(key);
    if (!object) {
      return c.json({ error: "Object not found" }, 404);
    }

    const text = await object.text();
    const content = JSON.parse(text);

    return c.json({ success: true, key, content });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Test DB: Create project
app.post("/test/db/project", async (c) => {
  try {
    const db = getDb();

    const { name, ownerId, description } = await c.req.json();
    const projectId = crypto.randomUUID();

    const [project] = await db
      .insert(projects)
      .values({
        id: projectId,
        ownerId: ownerId,
        name: name,
        description: description,
      })
      .returning();

    return c.json({ success: true, project });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Test DB + R2: Create doc
app.post("/test/db/doc", async (c) => {
  try {
    const db = getDb();
    const bucket = c.env.STORAGE;

    const { projectId, title, docType, content } = await c.req.json();
    const docId = crypto.randomUUID();

    // Store content in R2
    const r2Key = await putDocContent(bucket, projectId, docId, {
      title,
      content,
      type: docType,
    });

    // Store metadata in DB
    const [doc] = await db
      .insert(projectDocs)
      .values({
        id: docId,
        projectId: projectId,
        title: title,
        docType: docType,
        status: "active",
        r2Key: r2Key,
      })
      .returning();

    return c.json({ success: true, doc, r2Key });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Test: Get doc with content from R2
app.get("/test/db/doc/:projectId/:docId", async (c) => {
  try {
    const db = getDb();
    const bucket = c.env.STORAGE;

    const projectId = c.req.param("projectId");
    const docId = c.req.param("docId");

    // Get metadata from DB
    const [doc] = await db
      .select()
      .from(projectDocs)
      .where(eq(projectDocs.id, docId))
      .limit(1);

    if (!doc) {
      return c.json({ error: "Doc not found" }, 404);
    }

    // Get content from R2
    const content = await getDocContent(bucket, projectId, docId);

    return c.json({ success: true, doc, content });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// ===== PRODUCTION API ROUTES =====

// ===== PROJECT ROUTES =====

// POST /api/projects - Create new project
app.post("/api/projects", authMiddleware, async (c) => {
  try {
    const db = getDb();
    const user = c.get("user");

    const body = createProjectSchema.parse(await c.req.json());
    const projectId = crypto.randomUUID();

    const [project] = await db
      .insert(projects)
      .values({
        id: projectId,
        ownerId: user.id,
        name: body.name,
        description: body.description || null,
      })
      .returning();

    return c.json(project, 201);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return c.json({ error: "Invalid request", details: error.errors }, 400);
    }
    return c.json({ error: String(error) }, 500);
  }
});

// GET /api/projects/:projectId - Get single project
app.get("/api/projects/:projectId", dualAuthMiddleware, async (c) => {
  try {
    const db = getDb();
    const user = c.get("user");
    const isAgent = c.get("agentRequest");
    const agentUserId = c.get("agentUserId");
    const effectiveUserId = isAgent ? agentUserId : user?.id;

    const projectId = c.req.param("projectId");

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    if (project.ownerId !== effectiveUserId) {
       return c.json({ error: "Unauthorized" }, 403);
    }

    return c.json(project);
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// GET /api/projects - List all projects for owner
app.get("/api/projects", dualAuthMiddleware, async (c) => {
  try {
    const db = getDb();
    const user = c.get("user");
    const isAgent = c.get("agentRequest");
    const agentUserId = c.get("agentUserId");
    const effectiveUserId = isAgent ? agentUserId : user?.id;

    const projectList = await db
      .select()
      .from(projects)
      .where(eq(projects.ownerId, effectiveUserId));

    return c.json(projectList);
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// ===== DOC ROUTES =====

// POST /api/projects/:projectId/docs - Create new doc (supports file upload)
app.post("/api/projects/:projectId/docs", authMiddleware, async (c) => {
  try {
    const db = getDb();
    const bucket = c.env.STORAGE;
    const user = c.get("user");

    const projectId = c.req.param("projectId");

    // Validate project exists
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    if (project.ownerId !== user.id) {
       return c.json({ error: "Unauthorized" }, 403);
    }

    // Parse FormData
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }

    if (file.size === 0) {
      return c.json({ error: "File is empty" }, 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return c.json(
        {
          error: "File too large",
          details: `Max size is 2MB, got ${(file.size / 1024 / 1024).toFixed(2)}MB`,
        },
        400
      );
    }

    // Extract title from form field or use filename
    let title = (formData.get("title") as string) || file.name;

    // Remove file extension from auto-generated title
    if (!formData.get("title")) {
      title = title.replace(/\.[^/.]+$/, "");
    }

    // Infer docType from file extension or use provided value
    let docType = (formData.get("docType") as string) || inferDocType(file.name);

    // Validate extracted data
    let body;
    try {
      body = createDocSchema.parse({
        title: title || undefined,
        docType: docType || undefined,
      });
    } catch (validationError: any) {
      console.error("Validation error:", {
        title,
        docType,
        error: validationError.errors || validationError.message,
      });
      return c.json(
        {
          error: "Invalid request",
          details: validationError.errors || validationError.message,
        },
        400
      );
    }

    const docId = crypto.randomUUID();

    // Read file content
    const fileContent = await file.text();

    // Ensure title and docType have values
    const finalTitle = body.title || title;
    const finalDocType: "design" | "note" | "retro" | "other" = body.docType || (inferDocType(file.name) as "design" | "note" | "retro" | "other");

    // Store content in R2
    const r2Key = await putDocContent(bucket, projectId, docId, {
      title: finalTitle,
      content: fileContent,
      type: finalDocType,
    });

    // Store metadata in DB
    const [doc] = await db
      .insert(projectDocs)
      .values({
        id: docId,
        projectId: projectId,
        title: finalTitle,
        docType: finalDocType,
        status: "active",
        r2Key: r2Key,
      })
      .returning();

    // Enqueue doc for indexing (non-blocking, fails gracefully in local dev)
    try {
      await c.env.DOC_INDEXING_QUEUE.send({
        projectId,
        docId,
        r2_key: r2Key,
        op: "upsert",
        timestamp: new Date().toISOString(),
      } as DocIndexingMessage);
    } catch (queueError) {
      console.warn("Failed to enqueue doc for indexing:", queueError);
    }

    return c.json(doc, 201);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return c.json({ error: "Invalid request", details: error.errors }, 400);
    }
    return c.json({ error: String(error) }, 500);
  }
});

// GET /api/projects/:projectId/docs/:docId - Get doc with content
app.get("/api/projects/:projectId/docs/:docId", dualAuthMiddleware, async (c) => {
  try {
    const db = getDb();
    const bucket = c.env.STORAGE;
    const user = c.get("user");
    const isAgent = c.get("agentRequest");
    const agentUserId = c.get("agentUserId");
    const effectiveUserId = isAgent ? agentUserId : user?.id;

    const projectId = c.req.param("projectId");
    const docId = c.req.param("docId");

    // Verify project ownership (implicit authorization for doc access)
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
        return c.json({ error: "Project not found" }, 404);
    }

    if (project.ownerId !== effectiveUserId) {
        return c.json({ error: "Unauthorized" }, 403);
    }

    // Get metadata from DB
    const [doc] = await db
      .select()
      .from(projectDocs)
      .where(eq(projectDocs.id, docId))
      .limit(1);

    if (!doc) {
      return c.json({ error: "Doc not found" }, 404);
    }

    // Verify project ID matches
    if (doc.projectId !== projectId) {
      return c.json({ error: "Doc not found" }, 404);
    }

    // Get content from R2
    const content = await getDocContent(bucket, projectId, docId);

    if (!content) {
      return c.json({ error: "Doc content not found in storage" }, 404);
    }

    return c.json({ ...doc, content: content.content });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// GET /api/projects/:projectId/docs - List all docs for project
app.get("/api/projects/:projectId/docs", dualAuthMiddleware, async (c) => {
  try {
    const db = getDb();
    const user = c.get("user");
    const isAgent = c.get("agentRequest");
    const agentUserId = c.get("agentUserId");
    const effectiveUserId = isAgent ? agentUserId : user?.id;

    const projectId = c.req.param("projectId");

    // Verify project ownership
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    if (project.ownerId !== effectiveUserId) {
       return c.json({ error: "Unauthorized" }, 403);
    }

    const docs = await db
      .select()
      .from(projectDocs)
      .where(eq(projectDocs.projectId, projectId));

    return c.json(docs);
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// PUT /api/projects/:projectId/docs/:docId - Update doc
app.put("/api/projects/:projectId/docs/:docId", authMiddleware, async (c) => {
  try {
    const db = getDb();
    const bucket = c.env.STORAGE;
    const user = c.get("user");

    const projectId = c.req.param("projectId");
    const docId = c.req.param("docId");

    // Verify project ownership
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
        return c.json({ error: "Project not found" }, 404);
    }
    
    if (project.ownerId !== user.id) {
        return c.json({ error: "Unauthorized" }, 403);
    }

    // Verify doc exists and project matches
    const [existingDoc] = await db
      .select()
      .from(projectDocs)
      .where(eq(projectDocs.id, docId))
      .limit(1);

    if (!existingDoc) {
      return c.json({ error: "Doc not found" }, 404);
    }

    if (existingDoc.projectId !== projectId) {
      return c.json({ error: "Doc not found" }, 404);
    }

    const body = updateDocSchema.parse(await c.req.json());

    // Update content in R2
    await putDocContent(bucket, projectId, docId, {
      title: body.title,
      content: body.content,
      type: body.docType,
    });

    // Update metadata in DB
    const updateData: any = {
      title: body.title,
      docType: body.docType,
      updatedAt: new Date(),
    };

    if (body.status) {
      updateData.status = body.status;
    }

    const [doc] = await db
      .update(projectDocs)
      .set(updateData)
      .where(eq(projectDocs.id, docId))
      .returning();

    // Enqueue doc for re-indexing (non-blocking, fails gracefully in local dev)
    try {
      await c.env.DOC_INDEXING_QUEUE.send({
        projectId,
        docId,
        r2_key: existingDoc.r2Key,
        op: "upsert",
        timestamp: new Date().toISOString(),
      } as DocIndexingMessage);
    } catch (queueError) {
      console.warn("Failed to enqueue doc for re-indexing:", queueError);
    }

    return c.json(doc);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return c.json({ error: "Invalid request", details: error.errors }, 400);
    }
    return c.json({ error: String(error) }, 500);
  }
});

// ===== ISSUE ROUTES =====

// POST /api/projects/:projectId/issues - Create new issue
app.post("/api/projects/:projectId/issues", dualAuthMiddleware, async (c) => {
  try {
    const db = getDb();
    const bucket = c.env.STORAGE;
    const user = c.get("user");
    const isAgent = c.get("agentRequest");
    const agentUserId = c.get("agentUserId");
    const effectiveUserId = isAgent ? agentUserId : user?.id;

    const projectId = c.req.param("projectId");

    // Validate project exists
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    if (project.ownerId !== effectiveUserId) {
       return c.json({ error: "Unauthorized" }, 403);
    }

    const body = createIssueSchema.parse(await c.req.json());
    const issueId = crypto.randomUUID();

    // Store description in R2
    const r2Key = await putIssueDescription(bucket, projectId, issueId, {
      title: body.title,
      description: body.description,
    });

    // Store metadata in DB
    const [issue] = await db
      .insert(projectIssues)
      .values({
        id: issueId,
        projectId: projectId,
        title: body.title,
        status: "open",
        priority: body.priority || "medium",
        r2Key: r2Key,
      })
      .returning();

    return c.json(issue, 201);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return c.json({ error: "Invalid request", details: error.errors }, 400);
    }
    return c.json({ error: String(error) }, 500);
  }
});

// GET /api/projects/:projectId/issues/:issueId - Get issue with description
app.get("/api/projects/:projectId/issues/:issueId", dualAuthMiddleware, async (c) => {
  try {
    const db = getDb();
    const bucket = c.env.STORAGE;
    const user = c.get("user");
    const isAgent = c.get("agentRequest");
    const agentUserId = c.get("agentUserId");
    const effectiveUserId = isAgent ? agentUserId : user?.id;

    const projectId = c.req.param("projectId");
    const issueId = c.req.param("issueId");

    // Verify project ownership
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
        return c.json({ error: "Project not found" }, 404);
    }

    if (project.ownerId !== effectiveUserId) {
        return c.json({ error: "Unauthorized" }, 403);
    }

    // Get metadata from DB
    const [issue] = await db
      .select()
      .from(projectIssues)
      .where(eq(projectIssues.id, issueId))
      .limit(1);

    if (!issue) {
      return c.json({ error: "Issue not found" }, 404);
    }

    // Verify project ID matches
    if (issue.projectId !== projectId) {
      return c.json({ error: "Issue not found" }, 404);
    }

    // Get description from R2
    const issueData = await getIssueDescription(bucket, projectId, issueId);

    if (!issueData) {
      return c.json({ error: "Issue description not found in storage" }, 404);
    }

    return c.json({ ...issue, description: issueData.description });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// GET /api/projects/:projectId/issues - List all issues for project
app.get("/api/projects/:projectId/issues", dualAuthMiddleware, async (c) => {
  try {
    const db = getDb();
    const user = c.get("user");
    const isAgent = c.get("agentRequest");
    const agentUserId = c.get("agentUserId");
    const effectiveUserId = isAgent ? agentUserId : user?.id;

    const projectId = c.req.param("projectId");

    // Verify project ownership
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    if (project.ownerId !== effectiveUserId) {
       return c.json({ error: "Unauthorized" }, 403);
    }

    const issues = await db
      .select()
      .from(projectIssues)
      .where(eq(projectIssues.projectId, projectId));

    return c.json(issues);
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// PUT /api/projects/:projectId/issues/:issueId - Update issue
app.put("/api/projects/:projectId/issues/:issueId", dualAuthMiddleware, async (c) => {
  try {
    const db = getDb();
    const bucket = c.env.STORAGE;
    const user = c.get("user");
    const isAgent = c.get("agentRequest");
    const agentUserId = c.get("agentUserId");
    const effectiveUserId = isAgent ? agentUserId : user?.id;

    const projectId = c.req.param("projectId");
    const issueId = c.req.param("issueId");

    // Verify project ownership
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
        return c.json({ error: "Project not found" }, 404);
    }

    if (project.ownerId !== effectiveUserId) {
        return c.json({ error: "Unauthorized" }, 403);
    }

    // Verify issue exists and project matches
    const [existingIssue] = await db
      .select()
      .from(projectIssues)
      .where(eq(projectIssues.id, issueId))
      .limit(1);

    if (!existingIssue) {
      return c.json({ error: "Issue not found" }, 404);
    }

    if (existingIssue.projectId !== projectId) {
      return c.json({ error: "Issue not found" }, 404);
    }

    const body = updateIssueSchema.parse(await c.req.json());

    // Update description in R2
    await putIssueDescription(bucket, projectId, issueId, {
      title: body.title,
      description: body.description,
    });

    // Update metadata in DB
    const updateData: any = {
      title: body.title,
      updatedAt: new Date(),
    };

    if (body.status) {
      updateData.status = body.status;
    }

    if (body.priority) {
      updateData.priority = body.priority;
    }

    const [issue] = await db
      .update(projectIssues)
      .set(updateData)
      .where(eq(projectIssues.id, issueId))
      .returning();

    return c.json(issue);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return c.json({ error: "Invalid request", details: error.errors }, 400);
    }
    return c.json({ error: String(error) }, 500);
  }
});

// ===== RAG ROUTES =====

// POST /api/rag/query - Query project knowledge base with hybrid search
app.post("/api/rag/query", dualAuthMiddleware, async (c) => {
  const startTime = Date.now();

  try {
    const db = getDb();
    const user = c.get("user");
    const isAgent = c.get("agentRequest");
    const agentUserId = c.get("agentUserId");
    const effectiveUserId = isAgent ? agentUserId : user?.id;
    const body = ragQuerySchema.parse(await c.req.json());
    const { projectId, query, filters, config } = body;

    // Verify project ownership
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    if (project.ownerId !== effectiveUserId) {
       return c.json({ error: "Unauthorized" }, 403);
    }

    // Perform search
    const results = await hybridSearch({
      projectId,
      query,
      ai: c.env.AI,
      filters,
      limit: config?.limit,
      offset: config?.offset,
      hybridWeight: config?.hybridWeight,
      topK: config?.topK,
    });

    const queryTime = Date.now() - startTime;

    // Log query asynchronously (non-blocking)
    c.executionCtx.waitUntil(
      logRagQuery({
        projectId,
        query,
        filters: filters || null,
        resultCount: results.length,
        latency: queryTime,
      })
    );

    return c.json({
      results,
      metadata: {
        totalResults: results.length,
        queryTime,
      },
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return c.json({ error: "Invalid request", details: error.errors }, 400);
    }
    return c.json({ error: String(error) }, 500);
  }
});

// GET /api/rag/analytics/:projectId - Get RAG analytics for project
app.get("/api/rag/analytics/:projectId", authMiddleware, async (c) => {
  try {
    const db = getDb();
    const user = c.get("user");
    const projectId = c.req.param("projectId");

    // Verify project ownership
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    if (project.ownerId !== user.id) {
       return c.json({ error: "Unauthorized" }, 403);
    }

    const analytics = await getRagAnalytics(projectId);

    return c.json(analytics);
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// ===== AGENT SERVICE ROUTES =====

// POST /api/agent/query - Proxy to agent service
app.post("/api/agent/query", authMiddleware, async (c) => {
  try {
    const db = getDb();
    const user = c.get("user");
    const body = agentQuerySchema.parse(await c.req.json());

    // Verify project ownership
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, body.projectId))
      .limit(1);

    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    if (project.ownerId !== user.id) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const sessionId = `${body.projectId}-${user.id}`;
    const agentBaseUrl = c.env.AGENT_SERVICE_URL;

    // Ensure session exists (create if not)
    const sessionUrl = `${agentBaseUrl}/apps/my_agent/users/${user.id}/sessions/${sessionId}`;
    const sessionCheck = await fetch(sessionUrl);
    
    if (!sessionCheck.ok) {
      // Session doesn't exist, create it
      const createSessionUrl = `${agentBaseUrl}/apps/my_agent/users/${user.id}/sessions`;
      const createRes = await fetch(createSessionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      
      if (!createRes.ok) {
        const errText = await createRes.text();
        return c.json({ error: "Failed to create session", details: errText }, 500);
      }
    }

    // Now send the message
    const agentResponse = await fetch(`${agentBaseUrl}/run_sse`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Backend-Secret": c.env.AGENT_SERVICE_SECRET.trim(),
      },
      body: JSON.stringify({
        app_name: "my_agent",
        user_id: user.id,
        session_id: sessionId,
        new_message: {
          role: "user",
          parts: [{ text: body.query }],
        },
      }),
    });

    if (!agentResponse.ok) {
      const errorText = await agentResponse.text();
      return c.json(
        {
          error: "Agent service error",
          details: errorText,
        },
        agentResponse.status as any
      );
    }

    // Parse SSE response to extract final text
    const sseText = await agentResponse.text();
    const events = sseText.split("\n\n").filter(Boolean);
    let finalResponse = "";
    
    for (const event of events) {
      if (event.startsWith("data: ")) {
        try {
          const data = JSON.parse(event.slice(6));
          // Extract text from agent response events
          if (data.content?.parts) {
            for (const part of data.content.parts) {
              if (part.text) finalResponse += part.text;
            }
          }
        } catch {
          // Skip non-JSON events
        }
      }
    }

    return c.json({ response: finalResponse || "No response from agent" });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return c.json({ error: "Invalid request", details: error.errors }, 400);
    }
    return c.json({ error: String(error) }, 500);
  }
});

