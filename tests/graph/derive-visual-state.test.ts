import { describe, expect, it } from "vitest"
import {
  deriveEdgeStates,
  deriveNodeStates,
  type RunLike,
} from "../../src/lib/graph/derive-visual-state"
import type { Workflow } from "../../src/lib/schemas/workflow"
import type { StepRecord } from "../../src/lib/schemas/run"

const step = (partial: Partial<StepRecord> & Pick<StepRecord, "nodeId" | "status">): StepRecord => ({
  visit: 1,
  attempt: 1,
  startedAt: 0,
  citations: [],
  grounded: false,
  warnings: [],
  ...partial,
})

const workflow: Workflow = {
  id: "wf",
  name: "test",
  startNodeId: "n-1",
  nodes: [
    { id: "n-1", type: "decision", position: { x: 0, y: 0 }, data: { label: "Q", prompt: "Q?", context: { sources: [], requireCitation: false } } },
    { id: "n-2", type: "decision", position: { x: 0, y: 0 }, data: { label: "Support", prompt: "S?", context: { sources: [], requireCitation: false } } },
    { id: "n-3", type: "decision", position: { x: 0, y: 0 }, data: { label: "Sales", prompt: "B?", context: { sources: [], requireCitation: false } } },
  ],
  edges: [
    { id: "e-yes", source: "n-1", target: "n-2", sourceHandle: "yes", type: "yes" },
    { id: "e-no", source: "n-1", target: "n-3", sourceHandle: "no", type: "no" },
  ],
}

const runOf = (steps: StepRecord[]): RunLike => ({ steps })

describe("deriveNodeStates", () => {
  it("returns empty for no run", () => {
    expect(deriveNodeStates(null)).toEqual({})
    expect(deriveNodeStates(undefined)).toEqual({})
  })

  it("maps success answers to yes and no states", () => {
    const states = deriveNodeStates(runOf([
      step({ nodeId: "n-1", status: "success", answer: "YES" }),
      step({ nodeId: "n-2", status: "success", answer: "NO" }),
    ]))
    expect(states["n-1"]).toBe("success-yes")
    expect(states["n-2"]).toBe("success-no")
  })

  it("lets the latest step win when a node is retried", () => {
    const states = deriveNodeStates(runOf([
      step({ nodeId: "n-1", status: "running" }),
      step({ nodeId: "n-1", status: "error", attempt: 1, error: "boom" }),
      step({ nodeId: "n-1", status: "running", attempt: 2 }),
    ]))
    expect(states["n-1"]).toBe("running")
  })

  it("keeps an error state when the last attempt failed", () => {
    const states = deriveNodeStates(runOf([
      step({ nodeId: "n-1", status: "running" }),
      step({ nodeId: "n-1", status: "error", attempt: 1, error: "boom" }),
    ]))
    expect(states["n-1"]).toBe("error")
  })
})

describe("deriveEdgeStates", () => {
  it("marks every edge idle when the run has no steps", () => {
    expect(deriveEdgeStates(workflow, runOf([]))).toEqual({ "e-yes": "idle", "e-no": "idle" })
  })

  it("animates the chosen edge while the target is running", () => {
    const states = deriveEdgeStates(workflow, runOf([
      step({ nodeId: "n-1", status: "success", answer: "YES" }),
      step({ nodeId: "n-2", status: "running" }),
    ]))
    expect(states["e-yes"]).toBe("active")
    expect(states["e-no"]).toBe("dim")
  })

  it("animates the chosen edge when the target is still pending", () => {
    const states = deriveEdgeStates(workflow, runOf([
      step({ nodeId: "n-1", status: "success", answer: "NO" }),
    ]))
    expect(states["e-no"]).toBe("active")
    expect(states["e-yes"]).toBe("dim")
  })

  it("settles the edge to taken once the target finishes", () => {
    const states = deriveEdgeStates(workflow, runOf([
      step({ nodeId: "n-1", status: "success", answer: "YES" }),
      step({ nodeId: "n-2", status: "success", answer: "NO" }),
    ]))
    expect(states["e-yes"]).toBe("taken")
  })

  it("marks edges out of a failed node as error", () => {
    const states = deriveEdgeStates(workflow, runOf([
      step({ nodeId: "n-1", status: "error", error: "boom" }),
    ]))
    expect(states["e-yes"]).toBe("error")
    expect(states["e-no"]).toBe("error")
  })
})
