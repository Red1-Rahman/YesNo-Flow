"use client"

import { useEffect } from "react"
import { useWorkflowStore } from "@/store/workflow-store"

export const NodeEditor = () => {
  const workflow = useWorkflowStore((state) => state.workflow)
  const selectedNodeId = useWorkflowStore((state) => state.selectedNodeId)
  const setSelectedNodeId = useWorkflowStore((state) => state.setSelectedNodeId)
  const updateNode = useWorkflowStore((state) => state.updateNode)
  const removeNode = useWorkflowStore((state) => state.removeNode)
  const node = workflow.nodes.find((item) => item.id === selectedNodeId)

  useEffect(() => {
    if (!node) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedNodeId(undefined)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [node, setSelectedNodeId])

  if (!node) return null

  const close = () => setSelectedNodeId(undefined)
  return (
    <>
      <button className="fixed inset-0 z-20 cursor-default bg-black/20" onClick={close} aria-label="Close node editor" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="node-editor-title"
        className="absolute right-4 top-16 z-30 w-[min(24rem,calc(100vw-2rem))] rounded-lg border bg-card p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="node-editor-title" className="text-lg font-semibold">Edit decision</h2>
          <button onClick={close} aria-label="Close editor" className="rounded px-2 py-1 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">×</button>
        </div>
        <label className="mb-1 block text-sm font-medium" htmlFor="node-label">Label</label>
        <input
          id="node-label"
          value={node.data.label}
          onChange={(event) => updateNode(node.id, { label: event.target.value })}
          className="nodrag nowheel nokey mb-4 w-full rounded border bg-background p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          maxLength={80}
        />
        <label className="mb-1 block text-sm font-medium" htmlFor="node-prompt">Prompt</label>
        <textarea
          id="node-prompt"
          value={node.data.prompt}
          onChange={(event) => updateNode(node.id, { prompt: event.target.value })}
          className="nodrag nowheel nokey mb-4 min-h-32 w-full rounded border bg-background p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          maxLength={4000}
        />
        <div className="flex justify-between gap-2">
          <button className="rounded border px-3 py-2 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => removeNode(node.id)}>Delete node</button>
          <button className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={close}>Done</button>
        </div>
      </aside>
    </>
  )
}
