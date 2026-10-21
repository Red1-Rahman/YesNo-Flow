"use client"

import { useRef } from "react"
import { toast } from "sonner"
import { NodeContextSchema } from "@/lib/schemas/context"
import { WorkflowSchema } from "@/lib/schemas/workflow"
import { useWorkflowStore } from "@/store/workflow-store"

const buttonClass = "rounded-md border bg-card px-3 py-2 text-sm font-medium shadow-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"

const formatIssues = (issues: { path: (string | number)[]; message: string }[]) =>
  issues.slice(0, 5).map((issue) => `${issue.path.join(".") || "workflow"}: ${issue.message}`)

const slug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "workflow"

export const Toolbar = () => {
  const addNode = useWorkflowStore((state) => state.addNode)
  const setStartNode = useWorkflowStore((state) => state.setStartNode)
  const reset = useWorkflowStore((state) => state.reset)
  const workflow = useWorkflowStore((state) => state.workflow)
  const replace = useWorkflowStore((state) => state.replace)
  const selectedNodeId = useWorkflowStore((state) => state.selectedNodeId)
  const setSelectedNodeId = useWorkflowStore((state) => state.setSelectedNodeId)
  const updateNode = useWorkflowStore((state) => state.updateNode)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const contextFileInputRef = useRef<HTMLInputElement>(null)

  const startNodeId = selectedNodeId ?? workflow.nodes[0]?.id

  const exportWorkflow = () => {
    const parsed = WorkflowSchema.safeParse(workflow)
    if (!parsed.success) {
      toast.error("Cannot export this workflow", {
        description: formatIssues(parsed.error.issues).join("; "),
      })
      return
    }
    const blob = new Blob([JSON.stringify(parsed.data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `workflow-${slug(workflow.name)}.json`
    anchor.style.display = "none"
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    // Revoking synchronously can cancel the download before it starts.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast.success("Workflow exported")
  }

  const importWorkflow = async (file: File) => {
    let json: unknown
    try {
      json = JSON.parse(await file.text())
    } catch {
      // The store is untouched: validation happens before any replace.
      toast.error("Import failed", { description: "The file is not valid JSON." })
      return
    }
    const parsed = WorkflowSchema.safeParse(json)
    if (!parsed.success) {
      toast.error("Import failed", {
        description: formatIssues(parsed.error.issues).join("; "),
      })
      return
    }
    const hasGraph = workflow.nodes.length > 0 || workflow.edges.length > 0
    if (hasGraph && !window.confirm("Replace the current workflow with the imported one?")) {
      return
    }
    replace(parsed.data)
    const refs = new Set<string>()
    try {
      const response = await fetch("/api/context")
      const result = await response.json() as { refs?: { ref: string; format: string }[] }
      for (const item of result.refs ?? []) refs.add(`${item.format}:${item.ref}`)
    } catch { /* Import remains usable offline. */ }
    const missing = parsed.data.nodes.flatMap((item) => {
      const ctx = NodeContextSchema.parse(item.data.context ?? {})
      return ctx.sources.filter((source) => !refs.has(`${source.format}:${source.ref}`)).map((source) => `${item.id}: ${source.id} (${source.ref})`)
    })
    toast.success("Workflow imported", missing.length ? { description: `Missing context sources: ${missing.join(", ")}` } : undefined)
  }

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (file) void importWorkflow(file)
  }

  const importContext = async (file: File) => {
    let targetNodeId = selectedNodeId ?? workflow.nodes[0]?.id
    if (!targetNodeId) targetNodeId = addNode(40, 40)
    setSelectedNodeId(targetNodeId)

    try {
      const body = new FormData()
      body.set("file", file)
      const response = await fetch("/api/context", { method: "POST", body })
      const result = await response.json() as { ref?: string; format?: string; error?: string }
      if (!response.ok || !result.ref || !result.format) {
        toast.error("Context import failed", { description: result.error ?? "The file could not be imported." })
        return
      }

      const node = useWorkflowStore.getState().workflow.nodes.find((item) => item.id === targetNodeId)
      if (!node) {
        toast.error("Context import failed", { description: "The target node no longer exists." })
        return
      }
      const context = NodeContextSchema.parse(node.data.context ?? {})
      const baseId = file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "source"
      let id = baseId
      let suffix = 2
      while (context.sources.some((source) => source.id === id)) id = `${baseId.slice(0, 29)}-${suffix++}`
      const nextContext = NodeContextSchema.parse({ ...context, sources: [...context.sources, { id, ref: result.ref, format: result.format, required: true }] })
      updateNode(targetNodeId, { context: nextContext })
      toast.success("Context imported", { description: `Attached to ${node.data.label || "decision node"}.` })
    } catch {
      toast.error("Context import failed", { description: "The file could not be imported." })
    }
  }

  const onContextFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (file) void importContext(file)
  }

  return (
    <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
      <button className={buttonClass} onClick={() => setSelectedNodeId(addNode(40, 40))}>Add node</button>
      <button className={buttonClass} onClick={() => startNodeId && setStartNode(startNodeId)} disabled={!startNodeId}>Set as start</button>
      <button className={buttonClass} onClick={exportWorkflow}>Export</button>
      <button className={buttonClass} onClick={() => fileInputRef.current?.click()}>Import</button>
      <button className={buttonClass} onClick={() => contextFileInputRef.current?.click()}>Import context</button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-label="Import workflow file"
        onChange={onFileChange}
      />
      <input
        ref={contextFileInputRef}
        type="file"
        accept=".md,.txt,.json,.yaml,.yml"
        className="hidden"
        aria-label="Import context file"
        onChange={onContextFileChange}
      />
      <button
        className={buttonClass}
        onClick={() => {
          if (workflow.nodes.length > 0 && !window.confirm("Reset to the example workflow? Current graph will be lost.")) return
          reset()
        }}
      >
        Reset example
      </button>
    </div>
  )
}
