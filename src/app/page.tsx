"use client"

import { useCallback, useState } from "react"
import { Toaster } from "sonner"
import { FlowCanvas } from "@/components/flow/flow-canvas"
import { LogsPanel } from "@/components/run/logs-panel"
import { RunPanel } from "@/components/run/run-panel"
import { useRunPolling } from "@/hooks/use-run-polling"
import { useWorkflowStore } from "@/store/workflow-store"

export default function Home() {
  const workflow = useWorkflowStore((state) => state.workflow)
  const { run, connectionLost, startPolling } = useRunPolling()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const startRun = useCallback(
    async (input: string): Promise<boolean> => {
      const trimmed = input.trim()
      if (!trimmed || isSubmitting) return false
      setIsSubmitting(true)
      setSubmitError(null)
      try {
        const response = await fetch("/api/runs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workflow, input: trimmed }),
        })
        const payload: unknown = await response.json().catch(() => null)
        if (!response.ok) {
          const message =
            typeof payload === "object" && payload !== null && "error" in payload && typeof (payload as { error: unknown }).error === "string"
              ? (payload as { error: string }).error
              : "Failed to start the run."
          setSubmitError(message)
          return false
        }
        if (typeof payload === "object" && payload !== null && "runId" in payload && typeof (payload as { runId: unknown }).runId === "string") {
          startPolling((payload as { runId: string }).runId)
          return true
        }
        setSubmitError("The server did not return a run id.")
        return false
      } catch {
        setSubmitError("Could not reach the server.")
        return false
      } finally {
        setIsSubmitting(false)
      }
    },
    [isSubmitting, startPolling, workflow],
  )

  return (
    <main className="min-h-dvh bg-background p-4 text-foreground sm:p-6 lg:flex lg:h-dvh lg:flex-col lg:overflow-hidden">
      <Toaster position="top-right" richColors closeButton />
      <header className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">yesno-flow</h1>
          <p className="text-sm text-muted-foreground">Build a decision flow with YES and NO branches.</p>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:items-stretch">
        <div className="min-h-0 min-w-0 flex-1">
          <FlowCanvas run={run} />
        </div>
        <aside className="flex w-full min-h-0 flex-col gap-4 lg:h-full lg:w-96">
          <RunPanel
            workflow={workflow}
            run={run}
            connectionLost={connectionLost}
            submitError={submitError}
            isSubmitting={isSubmitting}
            onStartRun={startRun}
          />
          <LogsPanel workflow={workflow} run={run} />
        </aside>
      </div>
    </main>
  )
}
