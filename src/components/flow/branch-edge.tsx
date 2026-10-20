import { memo } from "react"
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react"
import type { BranchEdge } from "@/lib/types"

export const BranchEdgeView = memo(function BranchEdgeView(props: EdgeProps<BranchEdge>) {
  const isYes = props.type === "yes" || props.sourceHandleId === "yes"
  const color = isYes ? "#16a34a" : "#dc2626"
  const [path, labelX, labelY] = getBezierPath(props)
  return (
    <>
      <BaseEdge id={props.id} path={path} markerEnd={props.markerEnd} style={{ ...props.style, stroke: color, strokeWidth: 2 }} />
      <EdgeLabelRenderer>
        <span className="nodrag nopan pointer-events-none absolute rounded bg-background px-1.5 py-0.5 text-xs font-medium" style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`, color }}>
          {isYes ? "YES" : "NO"}
        </span>
      </EdgeLabelRenderer>
    </>
  )
})
