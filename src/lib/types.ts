import type { Edge, Node } from "@xyflow/react"
import type { z } from "zod"
import type {
  EdgeVisualState,
  NodeVisualState,
} from "./graph/derive-visual-state"
import type { DecisionNodeSchema, WorkflowSchema } from "./schemas/workflow"

export type Workflow = z.infer<typeof WorkflowSchema>
export type DecisionData = z.infer<typeof DecisionNodeSchema>["data"] & {
  /** Derived from the current run; never persisted to the store. */
  visualState?: NodeVisualState
}
export type DecisionNode = Node<DecisionData, "decision">
export type BranchEdge = Edge<{ visualState?: EdgeVisualState }, "yes" | "no">
