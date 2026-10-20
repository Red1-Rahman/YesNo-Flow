import { memo } from "react"
import { cn } from "@/lib/utils"

export function BranchEdgeView({ sourceHandle, ...props }: any) {
  const color = sourceHandle === "yes" ? "green" : "red"
  return (
    <g>
      <ReactFlow.Edge
        source={props.source}
        target={props.target}
        className={cn("arrow", "nodrag nowheel nokey")}
        style={{ stroke: color, strokeWidth: 2 }}
        type={sourceHandle}
      />
      <defs>
        <marker
          id={`arrowhead-${sourceHandle}`}
          refX={8}
          refY={3}
          markerWidth={8}
          markerHeight={6}
          orient="auto"
        >
          <polygon
            points={`0 0, ${color === "green" ? "8" : "0"} 3, 0 6`}
            fill={color}
          />
        </marker>
      </defs>
    </g>
  )
}