"use client"

import { useEffect, useMemo, useRef } from "react"
import { AlertTriangle, Check, Loader2, X } from "lucide-react"
import type { RunState, StepRecord } from "@/lib/schemas/run"
import { answerBadgeClasses } from "@/lib/ui/status-colors"
import { cn } from "@/lib/utils"
import type { WorkflowShape } from "@/store/workflow-store"
import { useWorkflowStore } from "@/store/workflow-store"

function statusContent(step: StepRecord) {
  if (step.status === "running") {
    return { icon: <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />, text: "Running", className: answerBadgeClasses.running }
  }
  if (step.status === "error") {
    return { icon: <AlertTriangle className="h-3 w-3" aria-hidden="true" />, text: "Error", className: answerBadgeClasses.error }
  }
  if (step.answer === "YES") {
    return { icon: <Check className="h-3 w-3" aria-hidden="true" />, text: "YES", className: answerBadgeClasses.YES }
  }
  return { icon: <X className="h-3 w-3" aria-hidden="true" />, text: "NO", className: answerBadgeClasses.NO }
}

export type LogsPanelProps = {
  workflow: WorkflowShape
  run: RunState | null
}

export const LogsPanel = ({ workflow, run }: LogsPanelProps) => {
  const listRef = useRef<HTMLOListElement>(null)
  const selectedNodeId = useWorkflowStore((state) => state.selectedNodeId)
  const setSelectedNodeId = useWorkflowStore((state) => state.setSelectedNodeId)
  const stepCount = run?.steps.length ?? 0

  // Auto-scroll to the newest row whenever a step is added.
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    list.scrollTop = list.scrollHeight
  }, [stepCount, run?.runId])

  const labelFor = (nodeId: string) =>
    workflow.nodes.find((node) => node.id === nodeId)?.data.label || nodeId

  // Each visit records a `running` row first, then a final `success`/`error`
  // row with the same node/visit/attempt. Collapse to the last row per attempt
  // so a finished visit shows its answer instead of a stale "Running" badge,
  // while distinct retry attempts each keep their own row.
  const visibleSteps = useMemo(() => {
    const byAttempt = new Map<string, StepRecord>()
    for (const step of run?.steps ?? []) {
      byAttempt.set(`${step.nodeId}:${step.visit}:${step.attempt}`, step)
    }
    return [...byAttempt.values()]
  }, [run])

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-2 rounded-lg border bg-card p-4 shadow-sm" aria-label="Execution logs">
      <h2 className="text-base font-semibold">Logs</h2>
      {!run && <p className="text-sm text-muted-foreground">Run the workflow to see execution logs.</p>}
      {run && stepCount === 0 && <p className="text-sm text-muted-foreground">Waiting for the first step...</p>}
      {run && stepCount > 0 && (
        <ol ref={listRef} className="flex max-h-[40vh] min-h-0 flex-col gap-1 overflow-y-auto lg:max-h-[calc(100vh-32rem)]">
          {visibleSteps.map((step) => {
            const { icon, text, className } = statusContent(step)
            const isSelected = selectedNodeId === step.nodeId
            return (
              <li key={`${run.runId}:${step.nodeId}:${step.visit}:${step.attempt}`}>
                <button
                  type="button"
                  onClick={() => setSelectedNodeId(step.nodeId)}
                  title={`Select ${labelFor(step.nodeId)} on the canvas`}
                  className={cn(
                    "w-full rounded border bg-background px-2 py-1.5 text-left text-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isSelected && "ring-2 ring-primary",
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{labelFor(step.nodeId)}</span>
                    <span className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-medium", className)}>
                      {icon}
                      {text}
                    </span>
                  </span>
                  <span className="mt-0.5 flex items-center gap-2 text-muted-foreground">
                    <span>visit {step.visit}</span>
                    <span>attempt {step.attempt}</span>
                    {typeof step.durationMs === "number" && <span>{step.durationMs}ms</span>}
                  </span>
                  {step.error && <span className="mt-0.5 block text-red-700 dark:text-red-400">{step.error}</span>}
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
