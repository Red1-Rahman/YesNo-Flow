import { memo } from "react"
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react"
import type { BranchEdge } from "@/lib/types"

export const BranchEdgeView = memo(function BranchEdgeView(props: EdgeProps<BranchEdge>) {
  const isYes = props.type === "yes" || props.sourceHandleId === "yes"
  const color = isYes ? "var(--color-green-600)" : "var(--color-red-600)"
  const [path, labelX, labelY] = getBezierPath(props)
  return (
    <>
      <BaseEdge id={props.id} path={path} markerEnd={props.markerEnd} style={{ ...props.style, stroke: color, strokeWidth: 2 }} />
      <EdgeLabelRenderer>
        <span className={`nodrag nopan pointer-events-none absolute rounded bg-background px-1.5 py-0.5 text-xs font-medium ${isYes ? "text-green-600" : "text-red-600"}`} style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`, color }}>
          {isYes ? "YES" : "NO"}
        </span>
      </EdgeLabelRenderer>
    </>
  )
})
