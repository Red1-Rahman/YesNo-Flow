import { NextResponse } from "next/server"
import { z } from "zod"
import { inngest } from "@/inngest/client"
import { env } from "@/lib/env"
import { validateWorkflow } from "@/lib/graph/validate"
import { createRun, updateRun } from "@/lib/run-store"
import { RUN_REQUESTED_EVENT, RunRequestSchema, RunRequestedSchema } from "@/lib/schemas/events"

const errorResponse = (error: string, status: number, issues?: string[]) =>
  NextResponse.json(issues ? { error, issues } : { error }, { status })

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse("Request body must be valid JSON.", 400)
  }

  const parsed = RunRequestSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(
      "Invalid run request.",
      400,
      parsed.error.issues.map((issue: z.ZodIssue) => `${issue.path.join(".") || "body"}: ${issue.message}`),
    )
  }

  const { workflow, input } = parsed.data

  const validation = validateWorkflow(workflow)
  if (!validation.ok) {
    return errorResponse("Invalid workflow graph.", 400, validation.issues)
  }

  if (!env.OPENAI_API_KEY) {
    return errorResponse(
      "OPENAI_API_KEY is not configured on the server. Add it to .env.local and restart the app.",
      400,
    )
  }

  const runId = crypto.randomUUID()
  createRun({ runId, input })

  try {
    await inngest.send({
      name: RUN_REQUESTED_EVENT,
      data: RunRequestedSchema.parse({ runId, workflow, input }),
    })
  } catch (error) {
    // Raw transport errors stay in server logs; the client gets a safe message.
    console.error("[api/runs] failed to send workflow/run.requested:", error)
    updateRun(runId, {
      status: "failed",
      error: "Could not queue the run. Is the Inngest dev server running?",
      finishedAt: Date.now(),
    })
    return errorResponse(
      "Could not queue the run. Is the Inngest dev server running?",
      500,
    )
  }

  return NextResponse.json({ runId })
}
