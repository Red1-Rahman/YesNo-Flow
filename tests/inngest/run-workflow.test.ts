import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/ai/decide", () => ({
  decide: vi.fn(),
}))

import { decide } from "@/lib/ai/decide"
import { runWorkflowLoop, type StepRunner } from "@/inngest/functions/run-workflow"
import { createRun, getRun } from "@/lib/run-store"
import type { Workflow } from "@/lib/schemas/workflow"

const decideMock = vi.mocked(decide)

/** A step runner that memoizes completed steps, like Inngest does. */
function createFakeStep(): StepRunner & { executed: string[] } {
  const done = new Map<string, unknown>()
  const executed: string[] = []
  return {
    executed,
    async run<T>(id: string, handler: () => T | Promise<T>): Promise<T> {
      if (done.has(id)) return done.get(id) as T
      executed.push(id)
      const result = await handler()
      done.set(id, result)
      return result
    },
  }
}

const yesNoWorkflow: Workflow = {
  id: "wf-1",
  name: "support or sales",
  startNodeId: "n-1",
  nodes: [
    { id: "n-1", type: "decision", position: { x: 0, y: 0 }, data: { label: "Support request?", prompt: "Is this a support request?" } },
    { id: "n-2", type: "decision", position: { x: 300, y: -100 }, data: { label: "Support node", prompt: "Product problem?" } },
    { id: "n-3", type: "decision", position: { x: 300, y: 100 }, data: { label: "Sales node", prompt: "Buying or pricing?" } },
  ],
  edges: [
    { id: "e1", source: "n-1", target: "n-2", sourceHandle: "yes", type: "yes" },
    { id: "e2", source: "n-1", target: "n-3", sourceHandle: "no", type: "no" },
  ],
}

const cyclicWorkflow: Workflow = {
  id: "wf-cycle",
  name: "cycle",
  startNodeId: "a",
  nodes: [
    { id: "a", type: "decision", position: { x: 0, y: 0 }, data: { label: "A", prompt: "Is A?" } },
    { id: "b", type: "decision", position: { x: 200, y: 0 }, data: { label: "B", prompt: "Is B?" } },
  ],
  edges: [
    { id: "e-ab", source: "a", target: "b", sourceHandle: "yes", type: "yes" },
    { id: "e-ba", source: "b", target: "a", sourceHandle: "yes", type: "yes" },
  ],
}

let counter = 0
const uniqueRunId = () => `run-loop-${counter++}`

describe("runWorkflowLoop", () => {
  beforeEach(() => {
    decideMock.mockReset()
  })

  it("follows the YES edge and ends at the node without a matching branch", async () => {
    const runId = uniqueRunId()
    createRun({ runId, input: "broken order" })
    decideMock.mockResolvedValueOnce("YES").mockResolvedValueOnce("NO")
    const step = createFakeStep()

    const result = await runWorkflowLoop({ runId, workflow: yesNoWorkflow, input: "broken order", step, maxSteps: 25 })

    expect(result.outcomeNodeId).toBe("n-2")
    expect(step.executed).toEqual(["node:n-1:visit:1", "node:n-2:visit:1", "run:finish"])
    expect(decideMock).toHaveBeenNthCalledWith(1, { prompt: "Is this a support request?", input: "broken order" })
    const run = getRun(runId)
    expect(run?.status).toBe("succeeded")
    expect(run?.outcomeNodeId).toBe("n-2")
    expect(run?.steps.map((s) => `${s.nodeId}:${s.status}`)).toEqual([
      "n-1:running",
      "n-1:success",
      "n-2:running",
      "n-2:success",
    ])
  })

  it("follows the NO edge to the sales node", async () => {
    const runId = uniqueRunId()
    createRun({ runId, input: "pricing" })
    decideMock.mockResolvedValueOnce("NO").mockResolvedValueOnce("YES")
    const step = createFakeStep()

    const result = await runWorkflowLoop({ runId, workflow: yesNoWorkflow, input: "pricing", step, maxSteps: 25 })

    expect(result.outcomeNodeId).toBe("n-3")
    expect(decideMock).toHaveBeenNthCalledWith(1, { prompt: "Is this a support request?", input: "pricing" })
  })

  it("stops a cycle with a NonRetriableError at max steps", async () => {
    const runId = uniqueRunId()
    createRun({ runId, input: "loop" })
    decideMock.mockResolvedValue("YES")
    const step = createFakeStep()

    await expect(
      runWorkflowLoop({ runId, workflow: cyclicWorkflow, input: "loop", step, maxSteps: 3 }),
    ).rejects.toThrow(/cycle/)
    expect(step.executed).toEqual(["node:a:visit:1", "node:b:visit:1", "node:a:visit:2", "run:fail"])

    // The run must carry the clear max steps message, not just fail silently.
    const run = getRun(runId)
    expect(run?.status).toBe("failed")
    expect(run?.error).toMatch(/maximum|cycle/i)
  })

  it("records each visit with a unique step id when a node repeats", async () => {
    const runId = uniqueRunId()
    createRun({ runId, input: "loop" })
    decideMock.mockResolvedValue("YES")
    const step = createFakeStep()

    await expect(
      runWorkflowLoop({ runId, workflow: cyclicWorkflow, input: "loop", step, maxSteps: 4 }),
    ).rejects.toThrow()
    expect(step.executed).toContain("node:a:visit:1")
    expect(step.executed).toContain("node:a:visit:2")
  })

  it("records an error step and rethrows when the decision fails", async () => {
    const runId = uniqueRunId()
    createRun({ runId, input: "x" })
    const failure = new Error("provider exploded: secret details")
    decideMock.mockRejectedValue(failure)
    const step = createFakeStep()

    await expect(
      runWorkflowLoop({ runId, workflow: yesNoWorkflow, input: "x", step, maxSteps: 25 }),
    ).rejects.toBe(failure)
    const run = getRun(runId)
    const last = run?.steps.at(-1)
    expect(last).toMatchObject({ nodeId: "n-1", status: "error", attempt: 1 })
    // Raw provider error text must not leak into the recorded step.
    expect(last?.error).not.toContain("secret details")
  })

  it("increments the attempt number on a retry of the same visit", async () => {
    const runId = uniqueRunId()
    createRun({ runId, input: "x" })
    decideMock.mockRejectedValueOnce(new Error("transient")).mockResolvedValue("NO")
    const step = createFakeStep()

    // First invocation fails (the step runner does not memoize failures,
    // so the second call models Inngest retrying the same step id).
    await expect(
      runWorkflowLoop({ runId, workflow: yesNoWorkflow, input: "x", step, maxSteps: 25 }),
    ).rejects.toThrow()

    // Retry: the same visit runs again, now as attempt 2. Reset the mock so
    // the retried n-1 decision is deterministic (NO -> sales node).
    decideMock.mockReset()
    decideMock.mockResolvedValueOnce("NO").mockResolvedValue("YES")
    const result = await runWorkflowLoop({ runId, workflow: yesNoWorkflow, input: "x", step, maxSteps: 25 })
    expect(result.outcomeNodeId).toBe("n-3")

    const run = getRun(runId)
    const attempts = run?.steps.filter((s) => s.nodeId === "n-1").map((s) => s.attempt)
    expect(attempts).toContain(1)
    expect(attempts).toContain(2)
    const errorRow = run?.steps.find((s) => s.status === "error")
    expect(errorRow?.attempt).toBe(1)
  })
})
