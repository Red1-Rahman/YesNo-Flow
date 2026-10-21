import { describe, expect, it } from "vitest"
import { NodeContextSchema } from "../../src/lib/schemas/context"
import { WorkflowSchema } from "../../src/lib/schemas/workflow"

describe("context schemas", () => {
  it("applies defaults and accepts a pre-context workflow", () => {
    const parsed = WorkflowSchema.parse({ id: "old", name: "old", startNodeId: "n", nodes: [{ id: "n", type: "decision", position: { x: 0, y: 0 }, data: { prompt: "Is it true?" } }], edges: [] })
    expect(parsed.nodes[0].data.context).toEqual({ sources: [], requireCitation: false })
  })
  it("rejects invalid and duplicate source ids", () => {
    expect(NodeContextSchema.safeParse({ sources: [{ id: "Upper", format: "json", ref: "x.json" }] }).success).toBe(false)
    const result = NodeContextSchema.safeParse({ sources: [{ id: "wallet", format: "json", ref: "a.json" }, { id: "wallet", format: "txt", ref: "b.txt" }] })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(["sources", 1, "id"])
  })
})
