import { create } from "zustand"
import { persist } from "zustand/middleware"
import {
  applyEdgeChanges as applyReactFlowEdgeChanges,
  applyNodeChanges as applyReactFlowNodeChanges,
  addEdge as addReactFlowEdge,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react"
import type { BranchEdge, DecisionNode } from "@/lib/types"

export type WorkflowShape = {
  id: string
  name: string
  startNodeId: string
  nodes: DecisionNode[]
  edges: BranchEdge[]
}

type WorkflowState = {
  workflow: WorkflowShape | null
  selectedNodeId?: string
  setWorkflow: (workflow: WorkflowShape) => void
  addNode: (x: number, y: number, label?: string) => string
  updateNode: (id: string, data: Partial<DecisionNode["data"]>) => void
  removeNode: (id: string) => void
  addEdge: (connection: Connection) => void
  removeEdge: (id: string) => void
  setStartNode: (id: string) => void
  applyNodeChanges: (changes: NodeChange<DecisionNode>[]) => void
  applyEdgeChanges: (changes: EdgeChange<BranchEdge>[]) => void
  reset: () => void
  replace: (workflow: WorkflowShape) => void
  setSelectedNodeId: (id?: string) => void
}

const emptyWorkflow = (): WorkflowShape => ({
  id: "yesno-flow",
  name: "yesno-flow",
  startNodeId: "",
  nodes: [],
  edges: [],
})

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      workflow: null,
      selectedNodeId: undefined,
      setWorkflow: (workflow) => set({ workflow }),
      addNode: (x, y, label = "New decision") => {
        const id = `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        set((state) => {
          const workflow = state.workflow ?? emptyWorkflow()
          return {
            workflow: {
              ...workflow,
              startNodeId: workflow.startNodeId || id,
              nodes: [...workflow.nodes, { id, type: "decision", position: { x, y }, data: { label, prompt: "" } }],
            },
          }
        })
        return id
      },
      updateNode: (id, data) => set((state) => state.workflow ? ({
        workflow: { ...state.workflow, nodes: state.workflow.nodes.map((node) => node.id === id ? { ...node, data: { ...node.data, ...data } } : node) },
      }) : state),
      removeNode: (id) => set((state) => state.workflow ? ({
        workflow: {
          ...state.workflow,
          nodes: state.workflow.nodes.filter((node) => node.id !== id),
          edges: state.workflow.edges.filter((edge) => edge.source !== id && edge.target !== id),
          startNodeId: state.workflow.startNodeId === id ? "" : state.workflow.startNodeId,
        },
        selectedNodeId: state.selectedNodeId === id ? undefined : state.selectedNodeId,
      }) : state),
      addEdge: (connection) => set((state) => {
        if (!state.workflow || !connection.source || !connection.target || (connection.sourceHandle !== "yes" && connection.sourceHandle !== "no")) return state
        if (connection.source === connection.target || state.workflow.edges.some((edge) => edge.source === connection.source && edge.sourceHandle === connection.sourceHandle)) return state
        const branch = connection.sourceHandle
        return { workflow: { ...state.workflow, edges: addReactFlowEdge({ ...connection, id: `e-${Date.now()}`, type: branch }, state.workflow.edges) } }
      }),
      removeEdge: (id) => set((state) => state.workflow ? ({ workflow: { ...state.workflow, edges: state.workflow.edges.filter((edge) => edge.id !== id) } }) : state),
      setStartNode: (id) => set((state) => state.workflow ? ({ workflow: { ...state.workflow, startNodeId: id } }) : state),
      applyNodeChanges: (changes) => set((state) => state.workflow ? ({ workflow: { ...state.workflow, nodes: applyReactFlowNodeChanges(changes, state.workflow.nodes) } }) : state),
      applyEdgeChanges: (changes) => set((state) => state.workflow ? ({ workflow: { ...state.workflow, edges: applyReactFlowEdgeChanges(changes, state.workflow.edges) } }) : state),
      reset: () => set({ workflow: emptyWorkflow(), selectedNodeId: undefined }),
      replace: (workflow) => set({ workflow }),
      setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId }),
    }),
    { name: "yesno-flow:workflow:v1", partialize: ({ workflow }) => ({ workflow }) },
  ),
)
