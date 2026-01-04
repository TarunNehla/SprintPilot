import { z } from "zod"

// Backend → Agent Service
export const agentQuerySchema = z.object({
  projectId: z.string().uuid(),
  query: z.string().min(1).max(2000)
})

// Agent Service response
export const agentResponseSchema = z.object({
  answer: z.string(),
  sources: z.array(z.object({
    type: z.enum(["doc", "issue"]),
    id: z.string(),
    title: z.string()
  })).optional()
})

export type AgentQuery = z.infer<typeof agentQuerySchema>
export type AgentResponse = z.infer<typeof agentResponseSchema>
