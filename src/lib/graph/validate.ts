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

/**
 * Validate a workflow graph against the invariants listed in architecture.md.
 *
 * Returns `{ ok: true }` when valid, or `{ ok: false, issues: string[] }` with
 * a human-readable list of problems.
 */
export function validateWorkflow(w: unknown): { ok: true } | { ok: false; issues: string[] } {
  let workflow: Workflow
  try {
    workflow = WorkflowSchema.parse(w)
  } catch (e) {
    return { ok: false, issues: [(e as Error).message] }
  }

  const issues: string[] = []

  // 1. startNodeId exists in nodes
  if (!workflow.nodes.some((n) => n.id === workflow.startNodeId)) {
    issues.push("startNodeId must exist in nodes")
  }

  // 2. Every edge references existing nodes
  const nodeIds = new Set(workflow.nodes.map((n) => n.id))
  for (const edge of workflow.edges) {
    if (!nodeIds.has(edge.source)) {
      issues.push(`Edge ${edge.id}: source node does not exist`)
    }
    if (!nodeIds.has(edge.target)) {
      issues.push(`Edge ${edge.id}: target node does not exist`)
    }
  }

  // 3. A node has at most one outgoing yes edge and at most one outgoing no edge
  const outgoingYes = new Map<string, string>()
  const outgoingNo = new Map<string, string>()
  for (const edge of workflow.edges) {
    if (edge.sourceHandle === "yes") {
      if (outgoingYes.has(edge.source)) {
        issues.push(`Node ${edge.source} has duplicate outgoing yes edge`)
      } else {
        outgoingYes.set(edge.source, edge.id)
      }
    }
    if (edge.sourceHandle === "no") {
      if (outgoingNo.has(edge.source)) {
        issues.push(`Node ${edge.source} has duplicate outgoing no edge`)
      } else {
        outgoingNo.set(edge.source, edge.id)
      }
    }
  }

  // 4. Every node has a non-empty prompt
  for (const node of workflow.nodes) {
    if (!node.data.prompt || node.data.prompt.trim() === "") {
      issues.push(`Node ${node.id} has an empty prompt`)
    }
  }

  if (issues.length === 0) {
    return { ok: true }
  }
  return { ok: false, issues }
}