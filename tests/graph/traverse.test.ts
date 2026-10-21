import { describe, expect, it } from "vitest"
import type { Workflow } from "../../src/lib/schemas/workflow"
import { findNextEdge, getNode } from "../../src/lib/graph/traverse"

const workflow: Workflow = {
  id: "wf",
  name: "Workflow",
  startNodeId: "a",
  nodes: [
    { id: "a", type: "decision", position: { x: 0, y: 0 }, data: { label: "A", prompt: "A?", context: { sources: [], requireCitation: false } } },
    { id: "b", type: "decision", position: { x: 1, y: 1 }, data: { label: "B", prompt: "B?", context: { sources: [], requireCitation: false } } },
  ],
  edges: [
    { id: "yes", source: "a", target: "b", sourceHandle: "yes", type: "yes" },
  ],
}

describe("graph traversal", () => {
  it("chooses the edge matching an answer", () => {
    expect(findNextEdge(workflow, "a", "YES")?.id).toBe("yes")
    expect(findNextEdge(workflow, "a", "NO")).toBeUndefined()
  })

  it("returns nodes by id", () => {
    expect(getNode(workflow, "b")?.data.label).toBe("B")
    expect(getNode(workflow, "missing")).toBeUndefined()
  })
})
