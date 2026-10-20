"use client"

import { useCallback, useMemo } from "react"
import {
  Background,
  Controls,
  ReactFlow,
  type Connection,
  type NodeMouseHandler,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import {
  deriveEdgeStates,
  deriveNodeStates,
  type NodeVisualState,
} from "@/lib/graph/derive-visual-state"
import type { RunState } from "@/lib/schemas/run"
import type { BranchEdge, DecisionNode } from "@/lib/types"
import { useWorkflowStore } from "@/store/workflow-store"
import { BranchEdgeView } from "./branch-edge"
import { DecisionNodeView } from "./decision-node"
import { NodeEditor } from "./node-editor"
import { Toolbar } from "./toolbar"

const nodeTypes = { decision: DecisionNodeView }
const edgeTypes = { yes: BranchEdgeView, no: BranchEdgeView }

export type FlowCanvasProps = {
  run: RunState | null
}

export const FlowCanvas = ({ run }: FlowCanvasProps) => {
  const workflow = useWorkflowStore((state) => state.workflow)
  const addEdge = useWorkflowStore((state) => state.addEdge)
  const setSelectedNodeId = useWorkflowStore((state) => state.setSelectedNodeId)
  const selectedNodeId = useWorkflowStore((state) => state.selectedNodeId)
  const onNodesChange = useWorkflowStore((state) => state.applyNodeChanges)
  const onEdgesChange = useWorkflowStore((state) => state.applyEdgeChanges)

  // Visual state is derived from the run and merged into a display copy of
  // the graph. The stored workflow is never mutated by execution.
  const nodeStates = useMemo(() => deriveNodeStates(run), [run])
  const edgeStates = useMemo(() => deriveEdgeStates(workflow, run), [workflow, run])

  const displayNodes = useMemo(
    () =>
      workflow.nodes.map((node) => ({
        ...node,
        // Reflect the store's selection so a node selected from the logs panel
        // (not just by clicking the canvas) shows the same ring.
        selected: node.id === selectedNodeId,
        data: {
          ...node.data,
          visualState: (nodeStates[node.id] ?? "idle") as NodeVisualState,
        },
      })),
    [workflow.nodes, nodeStates, selectedNodeId],
  )

  const displayEdges = useMemo(
    () =>
      workflow.edges.map((edge) => {
        const state = edgeStates[edge.id] ?? "idle"
        return {
          ...edge,
          animated: state === "active",
          data: { visualState: state },
        }
      }),
    [workflow.edges, edgeStates],
  )

  const onConnect = useCallback((connection: Connection) => addEdge(connection), [addEdge])
  const isValidConnection = useCallback((connection: Connection | BranchEdge) => {
    if (!connection.source || !connection.target || connection.source === connection.target) return false
    if (connection.sourceHandle !== "yes" && connection.sourceHandle !== "no") return false
    return !workflow.edges.some((edge) => edge.source === connection.source && edge.sourceHandle === connection.sourceHandle)
  }, [workflow.edges])
  const onNodeClick: NodeMouseHandler<DecisionNode> = useCallback((_event, node) => setSelectedNodeId(node.id), [setSelectedNodeId])

  return (
    <div className="relative h-[calc(100vh-4rem)] min-h-[560px] w-full overflow-hidden rounded-lg border bg-background">
      <ReactFlow<DecisionNode, BranchEdge>
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onNodeClick={onNodeClick}
        onPaneClick={() => setSelectedNodeId(undefined)}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        minZoom={0.2}
        maxZoom={2}
        deleteKeyCode={["Backspace", "Delete"]}
      >
        <Background />
        <Controls />
      </ReactFlow>
      <Toolbar />
      <NodeEditor />
    </div>
  )
}
