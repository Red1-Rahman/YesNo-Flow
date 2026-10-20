import type { RunState } from "../schemas/run"

export type NodeVisualState = "idle" | "running" | "success-yes" | "success-no" | "error"

export type EdgeVisualState = "idle" | "active" | "taken" | "dim" | "error"

export type RunLike = Pick<RunState, "steps"> | null | undefined

/**
 * The minimal edge shape this function reads. Accepts both the schema
 * Workflow (sourceHandle is "yes" | "no") and the React Flow store shape
 * (sourceHandle is optional string), so the canvas can pass its graph
 * directly without a cast.
 */
type EdgeLike = {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
}

/**
 * Reduce a run's step list to the latest state per node. Steps are appended
 * chronologically, so the last row seen for a node wins: a node that is
 * currently retrying shows `running` even if an earlier attempt errored.
 * Nodes with no steps yet are absent; callers treat them as `idle`.
 */
export function deriveNodeStates(run: RunLike): Record<string, NodeVisualState> {
  const states: Record<string, NodeVisualState> = {}
  for (const step of run?.steps ?? []) {
    if (step.status === "success" && step.answer) {
      states[step.nodeId] = step.answer === "YES" ? "success-yes" : "success-no"
    } else if (step.status === "running") {
      states[step.nodeId] = "running"
    } else if (step.status === "error") {
      states[step.nodeId] = "error"
    }
  }
  return states
}

/**
 * Edge states for the canvas.
 *
 * - `active`: the edge leaving a finished node along its chosen branch, while
 *   the target is running or not yet visited. This is the animated edge.
 * - `taken`: a chosen edge whose target has already produced its own state.
 * - `dim`: an edge out of a finished node whose branch was not chosen.
 * - `error`: an edge out of a node whose last visit failed.
 * - `idle`: source not visited yet.
 */
export function deriveEdgeStates(
  workflow: { edges: readonly EdgeLike[] },
  run: RunLike,
): Record<string, EdgeVisualState> {
  const nodeStates = deriveNodeStates(run)
  const states: Record<string, EdgeVisualState> = {}

  for (const edge of workflow.edges) {
    const sourceState = nodeStates[edge.source]
    if (!sourceState) {
      states[edge.id] = "idle"
      continue
    }
    if (sourceState === "running") {
      states[edge.id] = "idle"
      continue
    }
    if (sourceState === "error") {
      states[edge.id] = "error"
      continue
    }

    const chosenBranch = sourceState === "success-yes" ? "yes" : "no"
    if (edge.sourceHandle !== chosenBranch) {
      states[edge.id] = "dim"
      continue
    }

    // Chosen branch: animate while the target is running or still pending,
    // then settle to "taken" once the target has produced its own state.
    const targetState = nodeStates[edge.target]
    states[edge.id] = targetState === "running" || !targetState ? "active" : "taken"
  }

  return states
}
