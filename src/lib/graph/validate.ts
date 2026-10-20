import { z } from "zod"

export const AnswerSchema = z.enum(["YES", "NO"])

export type Answer = z.infer<typeof AnswerSchema>

export const BranchSchema = z.enum(["yes", "no"])
export type Branch = z.infer<typeof BranchSchema>

export const DecisionNodeSchema = z.object({
  id: z.string().min(1),
  type: z.literal("decision"),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.object({
    label: z.string().max(80).default(""),
    prompt: z.string().min(1).max(4000),
  }),
})

export const BranchEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: BranchSchema,
  type: BranchSchema,
})

export const WorkflowSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  startNodeId: z.string().min(1),
  nodes: z.array(DecisionNodeSchema).min(1).max(100),
  edges: z.array(BranchEdgeSchema).max(200),
})
export type Workflow = z.infer<typeof WorkflowSchema>