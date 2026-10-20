"use client"

import { useCallback, useEffect } from "react"
import {
  Background,
  Controls,
  ReactFlow,
  type Connection,
  type NodeMouseHandler,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import type { BranchEdge, DecisionNode } from "@/lib/types"
import { useWorkflowStore, type WorkflowShape } from "@/store/workflow-store"
import { BranchEdgeView } from "./branch-edge"
import { DecisionNodeView } from "./decision-node"
import { NodeEditor } from "./node-editor"

const nodeTypes = { decision: DecisionNodeView }
const edgeTypes = { yes: BranchEdgeView, no: BranchEdgeView }

const exampleWorkflow: WorkflowShape = {
  id: "yesno-flow",
  name: "yesno-flow",
  startNodeId: "n-1",
  nodes: [
    { id: "n-1", type: "decision", position: { x: 0, y: 0 }, data: { label: "Support request?", prompt: "Is this a support request?" } },
    { id: "n-2", type: "decision", position: { x: 300, y: -100 }, data: { label: "Support", prompt: "Handle this support request." } },
    { id: "n-3", type: "decision", position: { x: 300, y: 100 }, data: { label: "Sales", prompt: "Handle this sales request." } },
  ],
  edges: [
    { id: "e1", source: "n-1", target: "n-2", sourceHandle: "yes", targetHandle: null, type: "yes" },
    { id: "e2", source: "n-1", target: "n-3", sourceHandle: "no", targetHandle: null, type: "no" },
  ],
}

export const FlowCanvas = () => {
  const workflow = useWorkflowStore((state) => state.workflow)
  const replace = useWorkflowStore((state) => state.replace)
  const addNode = useWorkflowStore((state) => state.addNode)
  const addEdge = useWorkflowStore((state) => state.addEdge)
  const setStartNode = useWorkflowStore((state) => state.setStartNode)
  const setSelectedNodeId = useWorkflowStore((state) => state.setSelectedNodeId)
  const onNodesChange = useWorkflowStore((state) => state.applyNodeChanges)
  const onEdgesChange = useWorkflowStore((state) => state.applyEdgeChanges)

  useEffect(() => {
    if (!workflow) replace(exampleWorkflow)
  }, [workflow, replace])

  const onConnect = useCallback((connection: Connection) => addEdge(connection), [addEdge])
  const onNodeClick: NodeMouseHandler<DecisionNode> = useCallback((_event, node) => setSelectedNodeId(node.id), [setSelectedNodeId])

  return (
    <div className="relative h-[calc(100vh-5rem)] min-h-[600px] w-full">
      <ReactFlow<DecisionNode, BranchEdge>
        nodes={workflow?.nodes ?? []}
        edges={workflow?.edges ?? []}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        minZoom={0.2}
        maxZoom={2}
      >
        <Background />
        <Controls />
      </ReactFlow>
      <div className="absolute left-4 top-4 z-10 flex gap-2">
        <button className="rounded bg-blue-600 px-3 py-1 text-sm text-white" onClick={() => setSelectedNodeId(addNode(0, 0))}>Add node</button>
        <button className="rounded bg-green-700 px-3 py-1 text-sm text-white" onClick={() => workflow?.nodes[0] && setStartNode(workflow.nodes[0].id)} disabled={!workflow?.nodes.length}>Set first as start</button>
        <button className="rounded bg-gray-700 px-3 py-1 text-sm text-white" onClick={() => replace(exampleWorkflow)}>Reset</button>
      </div>
      <NodeEditor />
    </div>
  )
}
