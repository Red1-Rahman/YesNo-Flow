import { create } from "zustand"
import { persist } from "zustand/middleware"
import {
  addEdge as addReactFlowEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react"
import { WorkflowSchema } from "@/lib/schemas/workflow"
import type { BranchEdge, DecisionNode } from "@/lib/types"

export type WorkflowShape = {
  id: string
  name: string
  startNodeId: string
  nodes: DecisionNode[]
  edges: BranchEdge[]
}

type WorkflowState = {
  workflow: WorkflowShape
  selectedNodeId?: string
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

export function createExampleWorkflow(): WorkflowShape {
  return {
    id: "yesno-flow",
    name: "yesno-flow",
    startNodeId: "n-1",
    nodes: [
      { id: "n-1", type: "decision", position: { x: 0, y: 0 }, data: { label: "Support request?", prompt: "Is this a support request?" } },
      { id: "n-2", type: "decision", position: { x: 300, y: -100 }, data: { label: "Support node", prompt: "Is this request about a product or service problem?" } },
      { id: "n-3", type: "decision", position: { x: 300, y: 100 }, data: { label: "Sales node", prompt: "Is this request about buying or pricing?" } },
    ],
    edges: [
      { id: "e1", source: "n-1", target: "n-2", sourceHandle: "yes", targetHandle: null, type: "yes" },
      { id: "e2", source: "n-1", target: "n-3", sourceHandle: "no", targetHandle: null, type: "no" },
    ],
  }
}

const createEmptyWorkflow = (): WorkflowShape => ({
  id: "yesno-flow",
  name: "yesno-flow",
  startNodeId: "",
  nodes: [],
  edges: [],
})

function parseWorkflow(workflow: WorkflowShape): WorkflowShape {
  return WorkflowSchema.parse(workflow) as WorkflowShape
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set) => ({
      workflow: createExampleWorkflow(),
      selectedNodeId: undefined,
      addNode: (x, y, label = "New decision") => {
        const id = `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        set((state) => ({
          workflow: {
            ...state.workflow,
            startNodeId: state.workflow.startNodeId || id,
            nodes: [...state.workflow.nodes, {
              id,
              type: "decision",
              position: { x, y },
              data: { label, prompt: "Is this condition true?" },
            }],
          },
        }))
        return id
      },
      updateNode: (id, data) => set((state) => ({
        workflow: {
          ...state.workflow,
          nodes: state.workflow.nodes.map((node) => node.id === id
            ? { ...node, data: { ...node.data, ...data } }
            : node),
        },
      })),
      removeNode: (id) => set((state) => ({
        workflow: {
          ...state.workflow,
          nodes: state.workflow.nodes.filter((node) => node.id !== id),
          edges: state.workflow.edges.filter((edge) => edge.source !== id && edge.target !== id),
          startNodeId: state.workflow.startNodeId === id ? "" : state.workflow.startNodeId,
        },
        selectedNodeId: state.selectedNodeId === id ? undefined : state.selectedNodeId,
      })),
      addEdge: (connection) => set((state) => {
        const { source, target, sourceHandle } = connection
        if (!source || !target || (sourceHandle !== "yes" && sourceHandle !== "no")) return state
        if (source === target || state.workflow.edges.some((edge) => edge.source === source && edge.sourceHandle === sourceHandle)) return state
        return {
          workflow: {
            ...state.workflow,
            edges: addReactFlowEdge({
              ...connection,
              id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              type: sourceHandle,
            }, state.workflow.edges),
          },
        }
      }),
      removeEdge: (id) => set((state) => ({
        workflow: { ...state.workflow, edges: state.workflow.edges.filter((edge) => edge.id !== id) },
      })),
      setStartNode: (id) => set((state) => state.workflow.nodes.some((node) => node.id === id)
        ? { workflow: { ...state.workflow, startNodeId: id } }
        : state),
      applyNodeChanges: (changes) => set((state) => ({
        workflow: { ...state.workflow, nodes: applyNodeChanges(changes, state.workflow.nodes) },
      })),
      applyEdgeChanges: (changes) => set((state) => ({
        workflow: { ...state.workflow, edges: applyEdgeChanges(changes, state.workflow.edges) },
      })),
      reset: () => set({ workflow: createExampleWorkflow(), selectedNodeId: undefined }),
      replace: (workflow) => set({ workflow: parseWorkflow(workflow) }),
      setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId }),
    }),
    {
      name: "yesno-flow:workflow:v1",
      partialize: ({ workflow }) => ({ workflow }),
      merge: (persisted, current) => {
        const stored = persisted as Partial<WorkflowState> | undefined
        if (!stored?.workflow) return current
        try {
          return { ...current, workflow: parseWorkflow(stored.workflow as WorkflowShape) }
        } catch {
          return { ...current, workflow: createEmptyWorkflow() }
        }
      },
    },
  ),
)
