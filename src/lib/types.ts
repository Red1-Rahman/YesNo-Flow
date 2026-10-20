import type { Edge, Node } from "@xyflow/react"
import type { z } from "zod"
import type { DecisionNodeSchema, WorkflowSchema } from "./schemas/workflow"

export type Workflow = z.infer<typeof WorkflowSchema>
export type DecisionData = z.infer<typeof DecisionNodeSchema>["data"]
export type DecisionNode = Node<DecisionData, "decision">
export type BranchEdge = Edge<Record<string, never>, "yes" | "no">
