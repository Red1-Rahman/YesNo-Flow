import { useCallback } from "react"
import {
  ReactFlow,
  NodeChange,
  EdgeChange,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
} from "@xyflow/react"
import { useStore } from "zustand/vanilla"
import { useEffect } from "react"
import { cn } from "@/lib/utils"
import type { DecisionNode, BranchEdge } from "@/lib/types"
import { NodeEditor } from "./node-editor"
import { useWorkflowStore } from "@/store/workflow-store"

// Import the CSS once
import "@xyflow/react/dist/style.css"

export const FlowCanvas = () => {
  const {
    workflow,
    setWorkflow,
    addNode,
    updateNode,
    removeNode,
    addEdge,
    removeEdge,
    setStartNode,
    applyNodeChanges,
    applyEdgeChanges,
    reset,
    replace,
  } = useWorkflowStore()

  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>(undefined)

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setWorkflow(
        workflow
          ? {
              ...workflow,
              nodes: applyNodeChanges(changes, workflow.nodes),
            }
          : undefined,
      )
    },
    [workflow, setWorkflow],
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setWorkflow(
        workflow
          ? {
              ...workflow,
              edges: applyEdgeChanges(changes, workflow.edges),
            }
          : undefined,
      )
    },
    [workflow, setWorkflow],
  )

  const onNodeSelect = useCallback(
    (id: string) => {
      setSelectedNodeId(id)
    },
    [],
  )

  useEffect(() => {
    if (!workflow) {
      const exampleNodes: DecisionNode[] = [
        {
          id: "n-1",
          type: "decision",
          position: { x: 0, y: 0 },
          data: { question: "Is this a support request?", isStart: true },
        },
        {
          id: "n-2",
          type: "decision",
          position: { x: 300, y: -100 },
          data: { question: "Yes, it is.", isStart: false },
        },
        {
          id: "n-3",
          type: "decision",
          position: { x: 300, y: 100 },
          data: { question: "No, it is not.", isStart: false },
        },
      ]
      const exampleEdges: BranchEdge[] = [
        {
          id: "e1",
          source: "n-1",
          target: "n-2",
          answer: "yes",
        },
        {
          id: "e2",
          source: "n-1",
          target: "n-3",
          answer: "no",
        },
      ]
      replace({ nodes: exampleNodes, edges: exampleEdges, startNodeId: "n-1", name: "yesno-flow" })
    }
  }, [workflow, replace])

  const hasStartNode = workflow?.startNodeId
    ? workflow.nodes.some((n) => n.id === workflow.startNodeId)
    : false

  return (
    <ReactFlow<DecisionNode, BranchEdge>
      fitView fitViewOptions={{ padding: 0.2, maxZoom: 1 }} minZoom={0.2} maxZoom={2}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeSelect={onNodeSelect}
      nodeTypes={{ decision: NodeEditor }}
      edgeTypes={{ branch: BranchEdgeView }}
      defaultEdgeType="branch"
      className={cn("min-h-[600px]")}
    >
      {workflow?.nodes.map((node) => (
        <ReactFlow.Node
          key={node.id}
          type="decision"
          id={node.id}
          data={node.data}
        />
      ))}

      {workflow?.edges.map((edge) => (
        <ReactFlow.Edge
          key={edge.id}
          type={edge.answer}
          source={edge.source}
          target={edge.target}
          sourceHandle={edge.answer}
        />
      ))}

      {selectedNodeId && <NodeEditor />}

      <div className="fixed top-4 left-4 flex gap-2 z-50">
        <button
          onClick={() => {
            const newId = `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
            addNode(0, 0, "New Question")
            setSelectedNodeId(newId)
          }}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
        >
          +
        </button>
        <button
          onClick={() => setStartNode(workflow?.nodes[0]?.id ?? "")}
          className="px-3 py-1 bg-green-600 text-white rounded text-sm"
          disabled={!workflow?.nodes.length}
        >
          S
        </button>
        <button
          onClick={() => reset()}
          className="px-3 py-1 bg-gray-600 text-white rounded text-sm"
          disabled={!workflow?.nodes.length}
        >
          R
        </button>
      </div>
    </ReactFlow>
  )
}