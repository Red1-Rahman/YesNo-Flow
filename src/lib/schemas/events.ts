import { z } from "zod"
import { WorkflowSchema } from "./workflow"

export const RUN_REQUESTED_EVENT = "workflow/run.requested"

/** Body accepted by POST /api/runs. The server generates the runId. */
export const RunRequestSchema = z.object({
  workflow: WorkflowSchema,
  input: z.string().min(1).max(8000),
})
export type RunRequest = z.infer<typeof RunRequestSchema>

/** Payload of the workflow/run.requested event sent to Inngest. */
export const RunRequestedSchema = RunRequestSchema.extend({
  runId: z.string().min(1),
})
export type RunRequested = z.infer<typeof RunRequestedSchema>
