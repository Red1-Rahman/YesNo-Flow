"use client"

import { FlowCanvas } from "@/components/flow/flow-canvas"
import { RunPanel } from "@/components/run/run-panel"
import { useWorkflowStore } from "@/store/workflow-store"

export default function Home() {
  const workflow = useWorkflowStore((state) => state.workflow)

  return (
    <main className="min-h-screen bg-background p-4 text-foreground sm:p-6">
      <header className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">yesno-flow</h1>
          <p className="text-sm text-muted-foreground">Build a decision flow with YES and NO branches.</p>
        </div>
      </header>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <FlowCanvas />
        </div>
        <RunPanel workflow={workflow} />
      </div>
    </main>
  )
}
