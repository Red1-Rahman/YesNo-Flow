"use client"

import { useCallback, useState } from "react"
import { AlertTriangle, Play, RotateCcw, WifiOff } from "lucide-react"
import type { RunState } from "@/lib/schemas/run"
import { cn } from "@/lib/utils"
import type { WorkflowShape } from "@/store/workflow-store"

const buttonClass =
  "inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"

const statusClasses: Record<string, string> = {
  queued: "border-border bg-muted text-muted-foreground",
  running: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  succeeded: "border-green-600/40 bg-green-600/10 text-green-700 dark:text-green-400",
  failed: "border-red-600/40 bg-red-600/10 text-red-700 dark:text-red-400",
}

export type RunPanelProps = {
  workflow: WorkflowShape
  run: RunState | null
  connectionLost: boolean
  submitError: string | null
  isSubmitting: boolean
  onStartRun: (input: string) => Promise<boolean>
}

export const RunPanel = ({ workflow, run, connectionLost, submitError, isSubmitting, onStartRun }: RunPanelProps) => {
  const [input, setInput] = useState("")
  const [lastInput, setLastInput] = useState<string | null>(null)

  const isRunning = run?.status === "queued" || run?.status === "running"

  const submit = useCallback(async () => {
    if (await onStartRun(input)) {
      setLastInput(input)
    }
  }, [input, onStartRun])

  // "Run again" reuses the last submitted input, even if the box changed.
  const runAgain = useCallback(() => {
    const value = lastInput ?? input
    if (value.trim()) void onStartRun(value)
  }, [input, lastInput, onStartRun])

  return (
    <section className="flex w-full flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm lg:w-96" aria-label="Run">
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
      <div className="flex flex-wrap gap-2">
        <button
          className={buttonClass}
          onClick={() => void submit()}
          disabled={isSubmitting || isRunning || input.trim().length === 0}
        >
          <Play className="h-3.5 w-3.5" aria-hidden="true" />
          {isSubmitting ? "Starting..." : isRunning ? "Running..." : "Run"}
        </button>
        {lastInput && !isRunning && (
          <button className={cn(buttonClass, "border bg-card text-foreground hover:bg-muted")} onClick={runAgain} disabled={isSubmitting}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Run again
          </button>
        )}
      </div>

      {submitError && (
        <p role="alert" className="inline-flex items-start gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-sm text-amber-700 dark:text-amber-500">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {submitError}
        </p>
      )}

      {connectionLost && (
        <p role="status" className="inline-flex items-start gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-sm text-amber-700 dark:text-amber-500">
          <WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Connection lost. Retrying...
        </p>
      )}

      {run && (
        <div className="flex flex-col gap-2">
          <span className={cn("inline-flex w-fit items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium", statusClasses[run.status])}>
            {run.status === "running" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" aria-hidden="true" />}
            {run.status}
          </span>
          {run.status === "failed" && run.error && (
            <p role="alert" className="inline-flex items-start gap-1.5 rounded-md border border-red-600/40 bg-red-600/10 px-2 py-1.5 text-sm text-red-700 dark:text-red-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {run.error}
            </p>
          )}
          {run.outcomeNodeId && (
            <p className="text-xs text-muted-foreground">
              Outcome: {workflow.nodes.find((node) => node.id === run.outcomeNodeId)?.data.label || run.outcomeNodeId}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
