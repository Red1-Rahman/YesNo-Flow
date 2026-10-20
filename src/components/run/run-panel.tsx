"use client"

import { useCallback, useState } from "react"
import { useRunPolling } from "@/hooks/use-run-polling"
import type { WorkflowShape } from "@/store/workflow-store"

const buttonClass =
  "rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"

const statusClass =
  "rounded border px-2 py-0.5 text-xs font-medium"

const statusLabelClass: Record<string, string> = {
  queued: "text-muted-foreground",
  running: "text-blue-700",
  succeeded: "text-green-700",
  failed: "text-red-700",
}

const stepStatusClass: Record<string, string> = {
  running: "text-blue-700",
  success: "text-green-700",
  error: "text-red-700",
}

export const RunPanel = ({ workflow }: { workflow: WorkflowShape }) => {
  const [input, setInput] = useState("")
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { run, startPolling } = useRunPolling()

  const runWorkflow = useCallback(async () => {
    const value = input.trim()
    if (!value || isSubmitting) return
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const response = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow, input: value }),
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        const message =
          typeof payload === "object" && payload !== null && "error" in payload && typeof (payload as { error: unknown }).error === "string"
            ? (payload as { error: string }).error
            : "Failed to start the run."
        setSubmitError(message)
        return
      }
      if (typeof payload === "object" && payload !== null && "runId" in payload && typeof (payload as { runId: unknown }).runId === "string") {
        startPolling((payload as { runId: string }).runId)
      } else {
        setSubmitError("The server did not return a run id.")
      }
    } catch {
      setSubmitError("Could not reach the server.")
    } finally {
      setIsSubmitting(false)
    }
  }, [input, isSubmitting, startPolling, workflow])

  return (
    <section className="flex w-full flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm lg:w-96">
      <h2 className="text-base font-semibold">Run</h2>
      <label className="text-sm font-medium" htmlFor="run-input">
        Input
      </label>
      <textarea
        id="run-input"
        className="nodrag nowheel nokey min-h-24 w-full resize-y rounded-md border bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        placeholder="My order arrived broken, please help"
        value={input}
        maxLength={8000}
        onChange={(event) => setInput(event.target.value)}
      />
      <button className={buttonClass} onClick={() => void runWorkflow()} disabled={isSubmitting || input.trim().length === 0}>
        {isSubmitting ? "Starting..." : "Run"}
      </button>
      {submitError && (
        <p role="alert" className="text-sm text-red-700">
          {submitError}
        </p>
      )}
      {run && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className={`${statusClass} ${statusLabelClass[run.status] ?? ""}`}>{run.status}</span>
            {run.outcomeNodeId && <span className="text-xs text-muted-foreground">outcome: {run.outcomeNodeId}</span>}
          </div>
          {run.error && (
            <p role="alert" className="text-sm text-red-700">
              {run.error}
            </p>
          )}
          <ol className="flex max-h-72 flex-col gap-1 overflow-y-auto" aria-label="Run steps">
            {run.steps.map((step, index) => (
              <li key={`${step.nodeId}:${step.visit}:${index}`} className="rounded border bg-background px-2 py-1 text-xs">
                <span className="font-medium">{step.nodeId}</span>
                {" visit "}
                {step.visit}
                {step.answer && (
                  <span className={`ml-1 font-semibold ${step.answer === "YES" ? "text-green-700" : "text-red-700"}`}>
                    {step.answer}
                  </span>
                )}
                <span className={`ml-1 ${stepStatusClass[step.status] ?? ""}`}>[{step.status}]</span>
                {typeof step.durationMs === "number" && <span className="ml-1 text-muted-foreground">{step.durationMs}ms</span>}
                {step.error && <span className="ml-1 text-red-700">{step.error}</span>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  )
}
