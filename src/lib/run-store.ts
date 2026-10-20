import { z } from "zod"

const StepStatusSchema = z.enum(["running", "success", "error"])

const StepRecordSchema = z.object({
  nodeId: z.string(),
  visit: z.number().int().positive(),
  attempt: z.number().int().nonnegative(),
  status: StepStatusSchema,
  answer: z.enum(["YES", "NO"]).optional(),
  error: z.string().optional(),
  startedAt: z.number(),
  durationMs: z.number().optional(),
})

const RunStatusSchema = z.enum(["queued", "running", "succeeded", "failed"])

const RunStateSchema = z.object({
  runId: z.string(),
  status: RunStatusSchema,
  input: z.string(),
  startedAt: z.number(),
  finishedAt: z.number().optional(),
  steps: z.array(StepRecordSchema),
  outcomeNodeId: z.string().optional(),
  error: z.string().optional(),
})

export type StepRecord = z.infer<typeof StepRecordSchema>
export type RunState = z.infer<typeof RunStateSchema>

export const createRun = (initial: {
  runId: string
  status: "queued"
  input: string
}) => {
  return {
    runId: initial.runId,
    status: initial.status,
    input: initial.input,
    startedAt: Date.now(),
    finishedAt: undefined,
    steps: [],
    outcomeNodeId: undefined,
    error: undefined,
  }
}

export const appendStep = (run: RunState, step: StepRecord) => {
  const updated = RunStateSchema.parse({
    ...run,
    steps: [...run.steps, step],
  })
  return updated
}

export const updateRun = (run: RunState, updates: Partial<RunState>) => {
  return { ...run, ...updates }
}