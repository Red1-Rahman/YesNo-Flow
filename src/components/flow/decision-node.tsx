"use client"

import { AlertTriangle, Check, Loader2, X } from "lucide-react"
import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import type { NodeVisualState } from "@/lib/graph/derive-visual-state"
import { nodeStateClasses } from "@/lib/ui/status-colors"
import { cn } from "@/lib/utils"
import type { DecisionNode } from "@/lib/types"
import { useWorkflowStore } from "@/store/workflow-store"

/** Icon plus text, so status is never conveyed by color alone. */
const stateBadges: Record<NodeVisualState, { text: string; className: string }> = {
  idle: { text: "", className: "" },
  running: { text: "Running", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  "success-yes": { text: "YES", className: "bg-green-600/10 text-green-700 dark:text-green-400" },
  "success-no": { text: "NO", className: "bg-red-600/10 text-red-700 dark:text-red-400" },
  error: { text: "Error", className: "bg-amber-500/10 text-amber-700 dark:text-amber-500" },
}

export const DecisionNodeView = memo(function DecisionNodeView({ id, data, selected }: NodeProps<DecisionNode>) {
  const isStart = useWorkflowStore((state) => state.workflow?.startNodeId === id)
  const visualState = data.visualState ?? "idle"
  const badge = stateBadges[visualState]

  return (
    <div
      data-status={visualState}
      className={cn(
        "min-w-48 rounded-lg border bg-card p-3 transition-colors",
        nodeStateClasses[visualState],
        selected && "ring-2 ring-primary",
      )}
    >
      <Handle type="target" position={Position.Top} />
      {isStart && <span className="mb-1 inline-block rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground">Start</span>}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">{data.label || "Decision"}</p>
        {visualState === "running" && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-blue-700 dark:text-blue-400" aria-label="Running" />}
        {visualState === "success-yes" && <Check className="h-3.5 w-3.5 shrink-0 text-green-700 dark:text-green-400" aria-label="Answered YES" />}
        {visualState === "success-no" && <X className="h-3.5 w-3.5 shrink-0 text-red-700 dark:text-red-400" aria-label="Answered NO" />}
        {visualState === "error" && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-500" aria-label="Error" />}
      </div>
      <p className="line-clamp-3 text-xs text-muted-foreground">{data.prompt}</p>
      {badge.text && (
        <span className={cn("mt-2 inline-block rounded border px-1.5 py-0.5 text-xs font-medium", badge.className)}>
          {badge.text}
        </span>
      )}
      <Handle type="source" position={Position.Bottom} id="yes" style={{ left: "30%" }} />
      <Handle type="source" position={Position.Bottom} id="no" style={{ left: "70%" }} />
    </div>
  )
})
