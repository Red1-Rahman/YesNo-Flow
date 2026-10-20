"use client"

import { memo } from "react"
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react"
import type { EdgeVisualState } from "@/lib/graph/derive-visual-state"
import { edgeStrokeColors } from "@/lib/ui/status-colors"
import type { BranchEdge } from "@/lib/types"

const errorStroke = "var(--color-amber-500)"

export const BranchEdgeView = memo(function BranchEdgeView(props: EdgeProps<BranchEdge>) {
  const isYes = props.type === "yes" || props.sourceHandleId === "yes"
  const visualState = (props.data?.visualState ?? "idle") as EdgeVisualState
  // Chosen branch keeps its YES/NO color; an errored edge turns amber. The
  // active edge is animated by React Flow via edge.animated.
  const color = visualState === "error" ? errorStroke : isYes ? edgeStrokeColors.yes : edgeStrokeColors.no
  const [path, labelX, labelY] = getBezierPath(props)
  return (
    <>
      <BaseEdge
        id={props.id}
        path={path}
        markerEnd={props.markerEnd}
        style={{ ...props.style, stroke: color, strokeWidth: 2, opacity: visualState === "dim" ? 0.35 : 1 }}
      />
      <EdgeLabelRenderer>
        <span
          className={`nodrag nopan pointer-events-none absolute rounded bg-background px-1.5 py-0.5 text-xs font-medium ${visualState === "dim" ? "opacity-40" : ""} ${isYes ? "text-green-600" : "text-red-600"}`}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`, color }}
        >
          {isYes ? "YES" : "NO"}
        </span>
      </EdgeLabelRenderer>
    </>
  )
})
