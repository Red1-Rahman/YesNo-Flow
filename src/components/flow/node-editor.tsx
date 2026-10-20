"use client"

import { useEffect, useState } from "react"
import { useWorkflowStore } from "@/store/workflow-store"

export const NodeEditor = () => {
  const workflow = useWorkflowStore((state) => state.workflow)
  const selectedNodeId = useWorkflowStore((state) => state.selectedNodeId)
  const setSelectedNodeId = useWorkflowStore((state) => state.setSelectedNodeId)
  const updateNode = useWorkflowStore((state) => state.updateNode)
  const removeNode = useWorkflowStore((state) => state.removeNode)
  const node = workflow?.nodes.find((item) => item.id === selectedNodeId)
  const [label, setLabel] = useState("")
  const [prompt, setPrompt] = useState("")

  useEffect(() => {
    setLabel(node?.data.label ?? "")
    setPrompt(node?.data.prompt ?? "")
  }, [node?.id, node?.data.label, node?.data.prompt])

  if (!node) return null

  const close = () => setSelectedNodeId(undefined)
  return (
    <div className="absolute right-4 top-16 z-20 w-full max-w-sm rounded-lg border bg-background p-5 shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Edit decision</h3>
        <button onClick={close} aria-label="Close editor" className="rounded px-2 py-1 hover:bg-muted">×</button>
      </div>
      <label className="mb-1 block text-sm font-medium" htmlFor="node-label">Label</label>
      <input id="node-label" value={label} onChange={(event) => setLabel(event.target.value)} className="mb-4 w-full rounded border bg-background p-2" maxLength={80} />
      <label className="mb-1 block text-sm font-medium" htmlFor="node-prompt">Prompt</label>
      <textarea id="node-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} className="mb-4 min-h-32 w-full rounded border bg-background p-2" maxLength={4000} />
      <div className="flex justify-between gap-2">
        <button className="rounded border px-3 py-2 text-sm" onClick={() => { removeNode(node.id); close() }}>Delete node</button>
        <button className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground" onClick={() => { updateNode(node.id, { label, prompt }); close() }}>Save</button>
      </div>
    </div>
  )
}
