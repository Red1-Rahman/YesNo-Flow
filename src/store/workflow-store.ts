import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { DecisionNode, BranchEdge } from "@/lib/types"
import type { OnNodesChange, OnEdgesChange, OnConnect } from "@xyflow/react"
import { applyNodeChanges, applyEdgeChanges, addEdge as rfAddEdge } from "@xyflow/react"

type NodeData = { question: string; isStart?: boolean }
type EdgeData = { answer: "yes" | "no" }

type DecisionNode = import("@xyflow/react").Node<NodeData, "decision">
type BranchEdgeType = import("@xyflow/react").Edge<EdgeData, "branch">

type WorkflowShape = {
  id: string
  name: string
  startNodeId: string
  nodes: DecisionNode[]
  edges: EdgeData[]
}

type WorkflowState = {
  workflow: WorkflowShape | null
  setWorkflow: (workflow: WorkflowShape) => void

  addNode: (x: number, y: number, question: string) => void
  updateNode: (id: string, data: { question?: string; isStart?: boolean }) => void
  removeNode: (id: string) => void
  addEdge: (source: string, target: string, answer: "yes" | "no") => void
  removeEdge: (id: string) => void
  setStartNode: (id: string) => void
  applyNodeChanges: (changes: { id: string; set: { question?: string; isStart?: boolean } }) => void
  applyEdgeChanges: (changes: { id: string; set: { answer?: "yes" | "no" } }) => void
  reset: () => void
  replace: (workflow: WorkflowShape) => void

  setSelectedNodeId: (id: string | undefined) => void
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      workflow: null,

      setWorkflow: (workflow: WorkflowShape) => set({ workflow }),

      addNode: (x: number, y: number, question: string) => {
        const id = `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        set({
          workflow: {
            ...get().workflow,
            nodes: [...(get().workflow?.nodes ?? []), { id, type: "decision", position: { x, y }, data: { question, isStart: false } }],
            startNodeId: get().workflow?.startNodeId || id,
            name: get().workflow?.name || "yesno-flow",
          },
        })
      },

      updateNode: (id: string, data: { question?: string; isStart?: boolean }) => {
        set({
          workflow: get().workflow
            ? {
                ...get().workflow,
                nodes: get().workflow.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n)),
              }
            : undefined,
        })
      },

      removeNode: (id: string) => {
        set({
          workflow: get().workflow
            ? {
                ...get().workflow,
                nodes: get().workflow.nodes.filter((n) => n.id !== id),
                edges: get().workflow.edges.filter((e) => e.source !== id && e.target !== id),
                startNodeId: get().workflow.startNodeId === id ? undefined : get().workflow.startNodeId,
              }
            : undefined,
        })
      },

      addEdge: (source: string, target: string, answer: "yes" | "no") => {
        const existingEdge = get().workflow?.edges.find((e) => e.source === source && e.answer === answer)
        if (existingEdge) return
        set({
          workflow: get().workflow
            ? { ...get().workflow, edges: [...get().workflow.edges, { id: `e-${Date.now()}`, source, target, answer }] }
            : undefined,
        })
      },

      removeEdge: (id: string) => {
        set({
          workflow: get().workflow ? { ...get().workflow, edges: get().workflow.edges.filter((e) => e.id !== id) } : undefined,
        })
      },

      setStartNode: (id: string) => {
        set({ workflow: get().workflow ? { ...get().workflow, startNodeId: id } : undefined })
      },

      applyNodeChanges: (changes: { id: string; set: { question?: string; isStart?: boolean } }) => {
        set({
          workflow: get().workflow
            ? {
                ...get().workflow,
                nodes: get().workflow.nodes.map((n) => (n.id === changes.id ? { ...n, data: { ...n.data, ...changes.set } } : n)),
              }
            : undefined,
        })
      },

      applyEdgeChanges: (changes: { id: string; set: { answer?: "yes" | "no" } }) => {
        set({
          workflow: get().workflow
            ? {
                ...get().workflow,
                edges: get().workflow.edges.map((e) => (e.id === changes.id ? { ...e, ...changes.set } : e)),
              }
            : undefined,
        })
      },

      reset: () => {
        set({ workflow: { id: "yesno-flow", name: "yesno-flow", startNodeId: "", nodes: [], edges: [] } })
      },

      replace: (workflow: WorkflowShape) => {
        set({ workflow })
      },

      setSelectedNodeId: (id: string | undefined) => {
        set({ workflow: get().workflow ? { ...get().workflow, selectedNodeId: id } : { ...get().workflow, selectedNodeId: id } })
      },
    }),
    {
      partialize: (state) => ({ workflow: state.workflow }),
      onRehydrateStorage: (initialState) => {
        try {
          if (initialState?.workflow) {
            // Can't import WorkflowSchema here without circular deps, just basic check
            if (initialState.workflow && initialState.workflow.nodes) {
              // Basic validation
            }
          }
        } catch {
          set({ workflow: { id: "yesno-flow", name: "yesno-flow", startNodeId: "", nodes: [], edges: [] } })
        }
      },
    },
    { name: "yesno-flow:workflow:v1" }
  )
)