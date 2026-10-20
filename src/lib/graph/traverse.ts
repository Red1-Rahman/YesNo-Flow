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

/**
 * Derive the visual state for a node based on its run records.
 * Used by the canvas to display running/success/error state.
 */
export type NodeVisualState = "idle" | "running" | "success-yes" | "success-no" | "error"

/**
 * Derive visual state for all nodes in a workflow given their run records.
 */
export function deriveNodeStates(run: { steps: Array<{ nodeId: string; status: string; answer?: string }> }): Record<string, NodeVisualState> {
  const states: Record<string, NodeVisualState> = {}

  for (const step of run.steps) {
    const { nodeId, status, answer } = step
    if (status === "success" && answer) {
      states[nodeId] = answer === "YES" ? "success-yes" : "success-no"
    } else if (status === "running") {
      states[nodeId] = "running"
    } else if (status === "error") {
      states[nodeId] = "error"
    } else {
      states[nodeId] = "idle"
    }
  }

  return states
}

/**
 * Derive visual state for edges based on node states and run path.
 * An edge is animated when its source finished with the matching answer
 * and its target is running or not yet visited.
 */
export type EdgeVisualState = "idle" | "running" | "success-yes" | "success-no"

export function deriveEdgeStates(workflow: Workflow, nodeStates: Record<string, NodeVisualState>): Record<string, EdgeVisualState> {
  const states: Record<string, EdgeVisualState> = {}

  for (const edge of workflow.edges) {
    const sourceState = nodeStates[edge.source]
    const targetState = nodeStates[edge.target]

    // Animate edge when source finished with matching answer and target is running
    if (sourceState === "success-yes" && edge.sourceHandle === "yes" && targetState === "running") {
      states[edge.id] = "success-yes"
    } else if (sourceState === "success-no" && edge.sourceHandle === "no" && targetState === "running") {
      states[edge.id] = "success-no"
    }
  }

  return states
}