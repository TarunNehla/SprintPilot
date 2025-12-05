import type { DocIndexingMessage } from "@repo/data-ops/zod-schema/queues";
import { docIndexingMessageSchema } from "@repo/data-ops/zod-schema/queues";
import { initDatabase, getDb } from "@repo/data-ops/database/setup";
import { docChunks } from "@repo/data-ops/drizzle/schema";
import { getDocContent } from "@repo/data-ops/storage/r2";
import { eq, sql } from "drizzle-orm";
import { chunkText } from "./utils/chunking";

export default {
  async queue(
    batch: MessageBatch<DocIndexingMessage>,
    env: Env
  ): Promise<void> {
    // Initialize database connection
    initDatabase(env.DATABASE_URL);
    const db = getDb();

    console.log(`Processing batch of ${batch.messages.length} messages`);

    for (const message of batch.messages) {
      try {
        // Validate message schema
        const data = docIndexingMessageSchema.parse(message.body);
        console.log(`[${data.op}] Processing doc: ${data.docId}`);

        if (data.op === "delete") {
          // Delete all chunks for this doc
          await db.delete(docChunks).where(eq(docChunks.docId, data.docId));
          console.log(`Deleted chunks for doc: ${data.docId}`);
          message.ack();
          continue;
        }

        // UPSERT operation
        // 1. Fetch doc content from R2
        const docContent = await getDocContent(
          env.STORAGE,
          data.projectId,
          data.docId
        );

        if (!docContent) {
          console.error(`Doc content not found in R2: ${data.docId}`);
          message.retry();
          continue;
        }

        // 2. Chunk the content
        const chunks = chunkText(docContent.content);
        console.log(`Created ${chunks.length} chunks for doc: ${data.docId}`);

        // 3. Generate embeddings for all chunks (batch processing)
        const embeddings: number[][] = [];
        for (let i = 0; i < chunks.length; i += 10) {
          const batchChunks = chunks.slice(i, i + 10);
          const batchTexts = batchChunks.map((c) => c.text);

          // Call Workers AI for embeddings
          const response = (await env.AI.run(
            "@cf/baai/bge-small-en-v1.5",
            {
              text: batchTexts,
            }
          )) as any;

          console.log("Workers AI response:", JSON.stringify(response));

          // Workers AI returns { data: [[...], [...]] } or { data: [...] } for single text
          if (response?.data) {
            // If single text, data is single array [0.1, 0.2, ...], wrap it
            if (typeof response.data[0] === "number") {
              embeddings.push(response.data);
            } else {
              // Multiple texts, data is array of arrays [[...], [...]]
              embeddings.push(...response.data);
            }
          } else if (Array.isArray(response)) {
            // Fallback: direct array response
            embeddings.push(...response);
          }
        }

        if (embeddings.length !== chunks.length) {
          console.error(
            `Embedding count mismatch: ${embeddings.length} vs ${chunks.length}`
          );
          message.retry();
          continue;
        }

        // 4. Delete old chunks and insert new ones (no transaction - neon-http doesn't support it)
        // Delete old chunks
        await db.delete(docChunks).where(eq(docChunks.docId, data.docId));

        // Insert new chunks with embeddings
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const embedding = embeddings[i];

          await db.insert(docChunks).values({
            id: crypto.randomUUID(),
            docId: data.docId,
            chunkIndex: i,
            textContent: chunk.text,
            embedding: sql`${JSON.stringify(embedding)}::vector`,
            tokenCount: chunk.tokenCount,
            indexedAt: new Date(),
          });
        }

        console.log(
          `Successfully indexed ${chunks.length} chunks for doc: ${data.docId}`
        );
        message.ack();
      } catch (error) {
        console.error(`Error processing message:`, error);
        message.retry();
      }
    }
  },
};
