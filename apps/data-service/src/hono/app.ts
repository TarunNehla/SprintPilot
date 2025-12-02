import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { initDatabase, getDb } from "@repo/data-ops/database/setup";
import { projects, projectDocs } from "@repo/data-ops/drizzle/schema";
import {
  putDocContent,
  getDocContent,
  putIssueDescription,
  getIssueDescription,
} from "@repo/data-ops/storage/r2";

export const app = new Hono<{ Bindings: Env }>();

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
    initDatabase(c.env.DATABASE_URL);
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
    initDatabase(c.env.DATABASE_URL);
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
    initDatabase(c.env.DATABASE_URL);
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
