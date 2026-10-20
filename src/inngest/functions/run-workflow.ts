import { NonRetriableError } from "inngest"
import { decide } from "@/lib/ai/decide"
import { env } from "@/lib/env"
import { safeMessage } from "@/lib/errors"
import { findNextEdge, getNode } from "@/lib/graph/traverse"
import { appendStep, getRun, updateRun } from "@/lib/run-store"
import { RunRequestedSchema } from "@/lib/schemas/events"
import type { Answer, Workflow } from "@/lib/schemas/workflow"
import { inngest } from "../client"

/**
 * The subset of Inngest step tools the traversal loop needs. Keeping the
 * dependency narrow makes the loop testable with a fake step runner.
 */
export type StepRunner = {
  run<T>(id: string, handler: () => T | Promise<T>): Promise<T>
}
function nextAttempt(runId: string, nodeId: string, visit: number): number {
  const run = getRun(runId)
  if (!run) return 1
  const failed = run.steps.filter(
    (step) => step.nodeId === nodeId && step.visit === visit && step.status === "error",
  ).length
  return failed + 1
}

/**
 * Run one node visit. Records a `running` step, asks the model for YES or NO,
 * and records `success` or `error`. Every side effect happens here so it runs
 * exactly once per visit even when Inngest replays the function body.
 */
async function visitNode(params: {
  runId: string
  nodeId: string
  prompt: string
  input: string
  visit: number
}): Promise<Answer> {
  const { runId, nodeId, prompt, input, visit } = params
  const startedAt = Date.now()
  const attempt = nextAttempt(runId, nodeId, visit)
  appendStep(runId, { nodeId, visit, attempt, status: "running", startedAt })
  try {
    const answer = await decide({ prompt, input })
    appendStep(runId, {
      nodeId,
      visit,
      attempt,
      status: "success",
      answer,
      startedAt,
      durationMs: Date.now() - startedAt,
    })
    return answer
  } catch (error) {
    appendStep(runId, {
      nodeId,
      visit,
      attempt,
      status: "error",
      error: safeMessage(error),
      startedAt,
      durationMs: Date.now() - startedAt,
    })
    // Rethrow so Inngest retries this step; the next attempt records a new
    // error row with an incremented attempt number.
    throw error
  }
}

/**
 * The traversal loop. One graph node visit equals one `step.run` with id
 * `node:<nodeId>:visit:<n>`; the visit counter keeps ids unique in a cycle.
 * Cycles are legal but bounded by `maxSteps`.
 */
export async function runWorkflowLoop(params: {
  runId: string
  workflow: Workflow
  input: string
  step: StepRunner
  maxSteps: number
}): Promise<{ outcomeNodeId: string }> {
  const { runId, workflow, input, step, maxSteps } = params

  let current = workflow.startNodeId
  const visits = new Map<string, number>()
  let totalSteps = 0
  let outcomeNodeId: string | undefined

  while (current) {
    totalSteps += 1
    if (totalSteps > maxSteps) {
      const message = `Run stopped after ${maxSteps} steps. The workflow graph contains a cycle that never reaches a node without a matching branch.`
      // Record the terminal failure inside a step (runs once even on replay)
      // so the run carries a clear message, then stop without retrying.
      await step.run("run:fail", () =>
        updateRun(runId, { status: "failed", error: message, finishedAt: Date.now() }),
      )
      throw new NonRetriableError(message)
    }

    const node = getNode(workflow, current)
    if (!node) {
      const message = `Workflow is invalid: node "${current}" does not exist.`
      await step.run("run:fail", () =>
        updateRun(runId, { status: "failed", error: message, finishedAt: Date.now() }),
      )
      throw new NonRetriableError(message)
    }

    const visit = (visits.get(current) ?? 0) + 1
    visits.set(current, visit)

    const answer = await step.run(`node:${current}:visit:${visit}`, () =>
      visitNode({
        runId,
        nodeId: current,
        prompt: node.data.prompt,
        input,
        visit,
      }),
    )

    const edge = findNextEdge(workflow, current, answer)
    if (!edge) {
      outcomeNodeId = current
      break
    }
    current = edge.target
  }

  const outcome = outcomeNodeId ?? workflow.startNodeId
  await step.run("run:finish", () =>
    updateRun(runId, {
      status: "succeeded",
      outcomeNodeId: outcome,
      finishedAt: Date.now(),
    }),
  )
  return { outcomeNodeId: outcome }
}

export const runWorkflow = inngest.createFunction(
  {
    id: "run-workflow",
    retries: 2,
    onFailure: async ({ event }) => {
      // The original event data is nested inside the failure event.
      const original = event.data.event?.data
      const parsed = RunRequestedSchema.safeParse(original)
      if (!parsed.success) {
        console.error(
          "[run-workflow] onFailure could not parse the original event payload",
        )
        return
      }
      const { runId } = parsed.data
      const run = getRun(runId)
      // Leave runs that already recorded a terminal state untouched: their
      // specific message (for example the max steps error) is more useful
      // than the generic serialized error.
      if (!run || run.status === "succeeded" || run.status === "failed") return
      updateRun(runId, {
        status: "failed",
        error: safeMessage(event.data.error),
        finishedAt: Date.now(),
      })
    },
  },
  { event: "workflow/run.requested" },
  async ({ event, step }) => {
    const { runId, workflow, input } = RunRequestedSchema.parse(event.data)
    await step.run("run:start", () =>
      updateRun(runId, { status: "running" }),
    )
    return runWorkflowLoop({
      runId,
      workflow,
      input,
      // Inngest's step.run returns Jsonify-wrapped results; structurally it
      // satisfies StepRunner for the serializable "YES"/"NO" values we return.
      step: step as unknown as StepRunner,
      maxSteps: env.WORKFLOW_MAX_STEPS,
    })
  },
)
