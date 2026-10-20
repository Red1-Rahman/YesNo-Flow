import { beforeEach, describe, expect, it } from "vitest"
import { appendStep, createRun, getRun, updateRun } from "../src/lib/run-store"

let counter = 0
const uniqueRunId = () => `run-test-${counter++}`

describe("run-store", () => {
  beforeEach(() => {
    // Nothing global to reset: each test uses a fresh run id.
  })

  it("creates a queued run", () => {
    const run = createRun({ runId: uniqueRunId(), input: "hello" })
    expect(run.status).toBe("queued")
    expect(run.steps).toEqual([])
    expect(run.input).toBe("hello")
  })

  it("returns the same run from getRun", () => {
    const runId = uniqueRunId()
    createRun({ runId, input: "x" })
    expect(getRun(runId)?.input).toBe("x")
  })

  it("returns undefined for an unknown run", () => {
    expect(getRun("does-not-exist")).toBeUndefined()
  })

  it("appends steps in order and persists them", () => {
    const runId = uniqueRunId()
    createRun({ runId, input: "x" })
    appendStep(runId, { nodeId: "n-1", visit: 1, attempt: 1, status: "running", startedAt: 100 })
    appendStep(runId, { nodeId: "n-1", visit: 1, attempt: 1, status: "success", answer: "YES", startedAt: 100, durationMs: 25 })
    const run = getRun(runId)
    expect(run?.steps).toHaveLength(2)
    expect(run?.steps[1]).toMatchObject({ answer: "YES", durationMs: 25 })
  })

  it("rejects a step that is not YES or NO", () => {
    const runId = uniqueRunId()
    createRun({ runId, input: "x" })
    expect(() =>
      appendStep(runId, {
        nodeId: "n-1",
        visit: 1,
        attempt: 1,
        status: "success",
        answer: "MAYBE" as never,
        startedAt: 100,
      }),
    ).toThrow()
    expect(getRun(runId)?.steps).toHaveLength(0)
  })

  it("throws when appending to an unknown run", () => {
    expect(() =>
      appendStep("missing-run", { nodeId: "n-1", visit: 1, attempt: 1, status: "running", startedAt: 1 }),
    ).toThrow(/not found/)
  })

  it("updates run fields without touching runId", () => {
    const runId = uniqueRunId()
    createRun({ runId, input: "x" })
    const updated = updateRun(runId, { status: "succeeded", outcomeNodeId: "n-2", finishedAt: 5 })
    expect(updated.status).toBe("succeeded")
    expect(updated.outcomeNodeId).toBe("n-2")
    expect(updated.runId).toBe(runId)
  })

  it("throws when updating an unknown run", () => {
    expect(() => updateRun("missing-run", { status: "failed" })).toThrow(/not found/)
  })
})
