import { z } from "zod"
import { AnswerSchema } from "./workflow"

export const StepStatusSchema = z.enum(["running", "success", "error"])

export const StepRecordSchema = z.object({
  nodeId: z.string(),
  visit: z.number().int().positive(),
  attempt: z.number().int().nonnegative(),
  status: StepStatusSchema,
  answer: AnswerSchema.optional(),
  error: z.string().optional(),
  startedAt: z.number(),
  durationMs: z.number().optional(),
})

export const RunStatusSchema = z.enum(["queued", "running", "succeeded", "failed"])

export const RunStateSchema = z.object({
  runId: z.string(),
  status: RunStatusSchema,
  input: z.string(),
  startedAt: z.number(),
  finishedAt: z.number().optional(),
  steps: z.array(StepRecordSchema),
  outcomeNodeId: z.string().optional(),
  error: z.string().optional(),
})
