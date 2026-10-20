import { type Workflow } from "../schemas/workflow"
import { type Answer } from "../schemas/workflow"

export const findNextEdge = (workflow: Workflow, nodeId: string, branch: "yes" | "no") => {
  return workflow.edges.find(
    (e: { source: string; sourceHandle: "yes" | "no" }) => e.source === nodeId && e.sourceHandle === branch
  )
}

export const getNode = (workflow: Workflow, id: string) => {
  return workflow.nodes.find((n) => n.id === id)
}