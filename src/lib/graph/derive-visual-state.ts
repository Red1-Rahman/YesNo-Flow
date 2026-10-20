import { type Workflow } from "../schemas/workflow"
import type { RunState } from "../schemas/run"

export const deriveNodeStates = (run: Pick<RunState, "steps">) => {
  const states: Record<string, "idle" | "running" | "success-yes" | "success-no" | "error"> = {}

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

export const deriveEdgeStates = (workflow: Workflow, run: Pick<RunState, "steps">) => {
  const nodeStates = deriveNodeStates(run)
  const states: Record<string, "idle" | "running" | "success-yes" | "success-no" | "error"> = {}

  for (const edge of workflow.edges) {
    const sourceState = nodeStates[edge.source]
    const targetState = nodeStates[edge.target]

    if (sourceState === "success-yes" && edge.sourceHandle === "yes" && targetState === "running") {
      states[edge.id] = "success-yes"
    } else if (sourceState === "success-no" && edge.sourceHandle === "no" && targetState === "running") {
      states[edge.id] = "success-no"
    }
  }

  return states
}
