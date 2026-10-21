"use client"

import { useEffect, useRef, useState } from "react"
import { ContextFormatSchema, NodeContextSchema, type ContextSource, type NodeContext } from "@/lib/schemas/context"
import { useWorkflowStore } from "@/store/workflow-store"

export const NodeEditor = () => {
  const workflow = useWorkflowStore((state) => state.workflow)
  const selectedNodeId = useWorkflowStore((state) => state.selectedNodeId)
  const setSelectedNodeId = useWorkflowStore((state) => state.setSelectedNodeId)
  const updateNode = useWorkflowStore((state) => state.updateNode)
  const removeNode = useWorkflowStore((state) => state.removeNode)
  const node = workflow.nodes.find((item) => item.id === selectedNodeId)
  const pickerRef = useRef<HTMLInputElement>(null)
  const [available, setAvailable] = useState<{ ref: string; format: ContextSource["format"] }[]>([])
  const [availabilityLoaded, setAvailabilityLoaded] = useState(false)
  const [preview, setPreview] = useState<Record<string, string>>({})
  const [contextError, setContextError] = useState("")

  useEffect(() => {
    if (!node) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedNodeId(undefined)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [node, setSelectedNodeId])

  useEffect(() => {
    setAvailabilityLoaded(false)
    void fetch("/api/context").then((response) => response.json()).then((data: { refs?: { ref: string; format: string }[] }) => {
      setAvailable((data.refs ?? []).flatMap((item) => { const result = ContextFormatSchema.safeParse(item.format); return result.success ? [{ ref: item.ref, format: result.data }] : [] }))
      setAvailabilityLoaded(true)
    }).catch(() => setAvailable([]))
  }, [node?.id])

  if (!node) return null

  const close = () => setSelectedNodeId(undefined)
  const context = NodeContextSchema.parse(node.data.context ?? {})
  const saveContext = (next: NodeContext) => {
    const parsed = NodeContextSchema.safeParse(next)
    setContextError(parsed.success ? "" : parsed.error.issues[0]?.message ?? "Invalid context settings.")
    updateNode(node.id, { context: parsed.success ? parsed.data : next })
  }
  const refreshAvailable = async () => {
    try { const response = await fetch("/api/context"); const data = await response.json() as { refs?: { ref: string; format: string }[] }; setAvailable((data.refs ?? []).flatMap((item) => { const result = ContextFormatSchema.safeParse(item.format); return result.success ? [{ ref: item.ref, format: result.data }] : [] })); setAvailabilityLoaded(true) } catch { setAvailable([]) }
  }
  const addSource = (ref: string, format: ContextSource["format"]) => saveContext({ ...context, sources: [...context.sources, { id: `source-${context.sources.length + 1}`, ref, format, required: true }] })
  const upload = async (file: File) => {
    const body = new FormData(); body.set("file", file)
    const response = await fetch("/api/context", { method: "POST", body })
    const result = await response.json() as { ref?: string; format?: ContextSource["format"]; error?: string }
    if (!response.ok || !result.ref || !result.format) { setContextError(result.error ?? "Upload failed."); return }
    const id = (file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "source")
    let uniqueId = id
    let suffix = 2
    while (context.sources.some((source) => source.id === uniqueId)) uniqueId = `${id.slice(0, 29)}-${suffix++}`
    saveContext({ ...context, sources: [...context.sources, { id: uniqueId, ref: result.ref, format: result.format, required: true }] })
    await refreshAvailable()
  }
  return (
    <>
      <button className="fixed inset-0 z-20 cursor-default bg-black/20" onClick={close} aria-label="Close node editor" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="node-editor-title"
        className="absolute right-4 top-16 z-30 max-h-[calc(100%-5rem)] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border bg-card p-5 shadow-xl"
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
        <div className="mb-4 border-t pt-4">
          <h3 className="mb-2 text-sm font-semibold">Context</h3>
          <label className="mb-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={context.requireCitation} onChange={(event) => saveContext({ ...context, requireCitation: event.target.checked })} />Require a verified citation</label>
          <div className="mb-2 flex flex-wrap gap-2" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) void upload(file) }}>
            <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => pickerRef.current?.click()}>Import context</button>
            <select aria-label="Pick existing context" className="max-w-48 rounded border bg-background px-2 py-1 text-xs" defaultValue="" onFocus={() => void refreshAvailable()} onChange={(event) => { const selected = available.find((item) => item.ref === event.target.value); if (selected) addSource(selected.ref, selected.format); event.target.value = "" }}><option value="">Pick existing</option>{available.map((item) => <option key={item.ref} value={item.ref}>{item.ref}</option>)}</select>
            <input ref={pickerRef} hidden type="file" accept=".md,.txt,.json,.yaml,.yml" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file) }} />
          </div>
          <div className="max-h-64 space-y-3 overflow-y-auto">
            {context.sources.map((source, index) => <div key={`${source.id}:${index}`} className="space-y-2 rounded border p-2">
              <div className="grid grid-cols-2 gap-2"><input aria-label="Source id" value={source.id} onChange={(event) => saveContext({ ...context, sources: context.sources.map((item, i) => i === index ? { ...item, id: event.target.value } : item) })} className="min-w-0 rounded border bg-background p-1 text-xs" /><input aria-label="Source label" placeholder="Label" value={source.label ?? ""} onChange={(event) => saveContext({ ...context, sources: context.sources.map((item, i) => i === index ? { ...item, label: event.target.value } : item) })} className="min-w-0 rounded border bg-background p-1 text-xs" /></div>
              <div className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{source.ref}{availabilityLoaded && !available.some((item) => item.ref === source.ref && item.format === source.format) ? " · missing" : ""}</span><select aria-label="Source format" value={source.format} onChange={(event) => { const format = ContextFormatSchema.safeParse(event.target.value); if (format.success) saveContext({ ...context, sources: context.sources.map((item, i) => i === index ? { ...item, format: format.data } : item) }) }} className="rounded border bg-background p-1 text-xs">{ContextFormatSchema.options.map((format) => <option key={format}>{format}</option>)}</select></div>
              <div className="flex items-center justify-between text-xs"><label className="flex items-center gap-1"><input type="checkbox" checked={source.required} onChange={(event) => saveContext({ ...context, sources: context.sources.map((item, i) => i === index ? { ...item, required: event.target.checked } : item) })} />Required</label><span className="flex gap-2"><button type="button" className="underline" onClick={async () => { const response = await fetch("/api/context/preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(source) }); const value = await response.json() as { content?: string; error?: string }; setPreview({ ...preview, [source.id]: value.error ?? value.content ?? "No preview available" }) }}>Preview</button><button type="button" className="text-destructive underline" onClick={() => saveContext({ ...context, sources: context.sources.filter((_, i) => i !== index) })}>Remove</button></span></div>
              {preview[source.id] && <pre className="max-h-24 overflow-auto whitespace-pre-wrap rounded bg-muted p-2 text-xs">{preview[source.id]}</pre>}
            </div>)}
          </div>
          {contextError && <p role="alert" className="mt-2 text-xs text-destructive">{contextError}</p>}
        </div>
        <div className="flex justify-between gap-2">
          <button className="rounded border px-3 py-2 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => removeNode(node.id)}>Delete node</button>
          <button className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => { const result = NodeContextSchema.safeParse(node.data.context ?? {}); if (!result.success) { setContextError(result.error.issues[0]?.message ?? "Invalid context settings."); return } updateNode(node.id, { context: result.data }); close() }}>Done</button>
        </div>
      </aside>
    </>
  )
}
