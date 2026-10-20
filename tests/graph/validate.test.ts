import { describe, expect, it } from "vitest"
import { validateWorkflow } from "../../src/lib/graph/validate"

const node = (id: string) => ({
  id,
  type: "decision" as const,
  position: { x: 0, y: 0 },
  data: { label: id, prompt: "Is this valid?" },
})

const workflow = (overrides: Record<string, unknown> = {}) => ({
  id: "wf",
  name: "Workflow",
  startNodeId: "a",
  nodes: [node("a"), node("b")],
  edges: [],
  ...overrides,
})

describe("validateWorkflow", () => {
  it("accepts a valid workflow with missing branches", () => {
    expect(validateWorkflow(workflow())).toEqual({ ok: true })
  })

  it("rejects a missing start node and dangling edge references", () => {
    const result = validateWorkflow(workflow({
      startNodeId: "missing",
      edges: [{ id: "e1", source: "a", target: "missing", sourceHandle: "yes", type: "yes" }],
    }))

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.issues.join(" ")).toContain("startNodeId must exist")
  })

  it("rejects duplicate outgoing edges on the same branch", () => {
    const result = validateWorkflow(workflow({
      edges: [
        { id: "e1", source: "a", target: "b", sourceHandle: "yes", type: "yes" },
        { id: "e2", source: "a", target: "b", sourceHandle: "yes", type: "yes" },
      ],
    }))

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.issues).toContain("Node a has duplicate outgoing yes edge")
  })

  it("rejects malformed workflows and blank prompts", () => {
    expect(validateWorkflow({ nope: true }).ok).toBe(false)
    const result = validateWorkflow(workflow({ nodes: [{ ...node("a"), data: { label: "", prompt: "  " } }, node("b")] }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.issues).toContain("Node a has an empty prompt")
  })
})
