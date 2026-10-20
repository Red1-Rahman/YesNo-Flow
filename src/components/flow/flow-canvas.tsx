"use client"

import { useCallback } from "react"
import {
  Background,
  Controls,
  ReactFlow,
  type Connection,
  type NodeMouseHandler,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import type { BranchEdge, DecisionNode } from "@/lib/types"
import { useWorkflowStore } from "@/store/workflow-store"
import { Toolbar } from "../toolbar"
import { BranchEdgeView } from "./branch-edge"
import { DecisionNodeView } from "./decision-node"
import { NodeEditor } from "./node-editor"

const nodeTypes = { decision: DecisionNodeView }
const edgeTypes = { yes: BranchEdgeView, no: BranchEdgeView }

export const FlowCanvas = () => {
  const workflow = useWorkflowStore((state) => state.workflow)
  const addEdge = useWorkflowStore((state) => state.addEdge)
  const setSelectedNodeId = useWorkflowStore((state) => state.setSelectedNodeId)
  const onNodesChange = useWorkflowStore((state) => state.applyNodeChanges)
  const onEdgesChange = useWorkflowStore((state) => state.applyEdgeChanges)

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
        nodes={workflow.nodes}
        edges={workflow.edges}
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
