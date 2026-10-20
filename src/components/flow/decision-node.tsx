import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import type { DecisionNode } from "@/lib/types"
import { useWorkflowStore } from "@/store/workflow-store"

export const DecisionNodeView = memo(function DecisionNodeView({ id, data, selected }: NodeProps<DecisionNode>) {
  const isStart = useWorkflowStore((state) => state.workflow?.startNodeId === id)
  return (
    <div className={["min-w-48 rounded-lg border bg-card p-3", selected && "ring-2 ring-primary"].filter(Boolean).join(" ")}>
      <Handle type="target" position={Position.Top} />
      {isStart && <span className="mb-1 inline-block rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground">Start</span>}
      <p className="text-sm font-medium">{data.label || "Decision"}</p>
      <p className="line-clamp-3 text-xs text-muted-foreground">{data.prompt}</p>
      <Handle type="source" position={Position.Bottom} id="yes" style={{ left: "30%" }} />
      <Handle type="source" position={Position.Bottom} id="no" style={{ left: "70%" }} />
    </div>
  )
})
