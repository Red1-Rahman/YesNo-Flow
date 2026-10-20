"use client"

import { useWorkflowStore } from "@/store/workflow-store"

const buttonClass = "rounded-md border bg-card px-3 py-2 text-sm font-medium shadow-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"

export const Toolbar = () => {
  const addNode = useWorkflowStore((state) => state.addNode)
  const setStartNode = useWorkflowStore((state) => state.setStartNode)
  const reset = useWorkflowStore((state) => state.reset)
  const workflow = useWorkflowStore((state) => state.workflow)
  const selectedNodeId = useWorkflowStore((state) => state.selectedNodeId)
  const setSelectedNodeId = useWorkflowStore((state) => state.setSelectedNodeId)

  const startNodeId = selectedNodeId ?? workflow.nodes[0]?.id

  return (
    <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
      <button className={buttonClass} onClick={() => setSelectedNodeId(addNode(40, 40))}>Add node</button>
      <button className={buttonClass} onClick={() => startNodeId && setStartNode(startNodeId)} disabled={!startNodeId}>Set as start</button>
      <button className={buttonClass} onClick={reset}>Reset example</button>
    </div>
  )
}
