import { create } from "zustand"
import { persist } from "zustand/middleware"
import { WorkflowSchema } from "../lib/schemas/workflow"

type WorkflowState = {
  workflow: import("../lib/schemas/workflow").Workflow | null
  setWorkflow: (workflow: import("../lib/schemas/workflow").Workflow) => void
  resetWorkflow: () => void
  importWorkflow: (json: string) => { success: boolean; issues?: string | null }
  exportWorkflow: () => string | null
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      workflow: null,
      setWorkflow: (workflow) => set({ workflow }),
      resetWorkflow: () => set({ workflow: null }),
      importWorkflow: (json: string) => {
        try {
          const parsed = WorkflowSchema.parse(JSON.parse(json))
          set({ workflow: parsed })
          return { success: true, issues: null }
        } catch (e) {
          return { success: false, issues: (e as Error).message }
        }
      },
      exportWorkflow: () => {
        const w = get().workflow
        return w ? JSON.stringify(w) : null
      },
    }),
    {
      name: "yesno-flow:workflow:v1",
    }
  )
)