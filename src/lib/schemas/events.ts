import { z } from "zod"
import { WorkflowSchema } from "./workflow"

export const RunRequestedSchema = z.object({
  runId: z.string(),
  workflow: WorkflowSchema,
  input: z.string().min(1).max(8000),
})