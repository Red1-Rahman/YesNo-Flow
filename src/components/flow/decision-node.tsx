import { memo } from "react"
import { Handle, Position } from "@xyflow/react"
import type { NodeProps } from "@xyflow/react"
import type { DecisionNode } from "@/lib/types"
import { cn } from "@/lib/utils"

export function DecisionNodeView({ data, selected }: NodeProps<DecisionNode>) {
  const classes = cn(
    "rounded-lg border bg-card p-3",
    selected && "ring-2 ring-primary",
    "nodrag nowheel nokey",
  )
  return (
    <div className={classes}>
      <Handle type="target" position={Position.Top} />
      <p className="text-sm font-medium">{data.question || "Decision"}</p>
      <p
        className="text-xs text-muted-foreground line-clamp-3"
        style={{ overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxSizing: "border-box" }}
      >
        {data.question}
      </p>
      <Handle type="source" position={Position.Bottom} id="yes" style={{ left: "30%" }} />
      <Handle type="source" position={Position.Bottom} id="no" style={{ left: "70%" }} />
    </div>
  )
}