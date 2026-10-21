import { AppError } from "./errors"
import { RunStateSchema, type RunState, type StepRecordInput } from "./schemas/run"

/**
 * In-memory run store backed by a Map on globalThis so it survives Next.js
 * hot reloads. The Inngest dev server calls back into the same process, so
 * the API routes and the run-workflow function share this store in dev.
 *
 * Not durable and not multi-instance safe. Swap the four exported functions
 * for Redis, Postgres, or Inngest Realtime in production; keep the interface.
 */

type GlobalWithRuns = typeof globalThis & {
  __yesnoFlowRunStore?: Map<string, RunState>
}

const globalStore = globalThis as GlobalWithRuns
const runs: Map<string, RunState> =
  globalStore.__yesnoFlowRunStore ?? (globalStore.__yesnoFlowRunStore = new Map())

export function createRun(initial: {
  runId: string
  input: string
}): RunState {
  const run = RunStateSchema.parse({
    runId: initial.runId,
    status: "queued",
    input: initial.input,
    startedAt: Date.now(),
    steps: [],
  })
  runs.set(run.runId, run)
  return run
}

export function getRun(runId: string): RunState | undefined {
  const run = runs.get(runId)
  if (!run) return undefined
  const parsed = RunStateSchema.safeParse(run)
  if (!parsed.success) return undefined
  runs.set(runId, parsed.data)
  return parsed.data
}

export function appendStep(runId: string, step: StepRecordInput): RunState {
  const run = runs.get(runId)
  if (!run) {
    throw new AppError(`Run ${runId} was not found in the run store.`)
  }
  const updated = RunStateSchema.parse({
    ...run,
    steps: [...run.steps, step],
  })
  runs.set(runId, updated)
  return updated
}

export function updateRun(
  runId: string,
  updates: Partial<Omit<RunState, "runId">>,
): RunState {
  const run = runs.get(runId)
  if (!run) {
    throw new AppError(`Run ${runId} was not found in the run store.`)
  }
  const updated = RunStateSchema.parse({ ...run, ...updates, runId })
  runs.set(runId, updated)
  return updated
}
