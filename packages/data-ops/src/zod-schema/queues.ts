import { z } from "zod";

// Queue message for document indexing
export const docIndexingMessageSchema = z.object({
  projectId: z.string().uuid(),
  docId: z.string().uuid(),
  r2_key: z.string(),
  op: z.enum(["upsert", "delete"]),
  timestamp: z.string().datetime(),
});

export type DocIndexingMessage = z.infer<typeof docIndexingMessageSchema>;
