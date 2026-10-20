import { describe, it, expect } from "vitest"
import { WorkflowSchema } from "../../src/lib/schemas/workflow"

describe("WorkflowSchema", () => {
  it("parses a valid workflow", () => {
    const { parse } = WorkflowSchema
    const result = parse({
      id: "wf-1",
      name: "Test",
      startNodeId: "n-1",
      nodes: [
        {
          id: "n-1",
          type: "decision",
          position: { x: 0, y: 0 },
          data: { label: "", prompt: "Test?" },
        },
      ],
      edges: [],
    })
    expect(result).toBeDefined()
  })
})