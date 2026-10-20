import { useCallback, useState } from "react"
import { useWorkflowStore } from "@/store/workflow-store"
import { cn } from "@/lib/utils"

type NodeData = { label: string; prompt: string }

export const NodeEditor = () => {
  const { workflow, updateNode, removeNode, setStartNode } = useWorkflowStore()
  const [editingNodeId, setEditingNodeId] = useState<string | undefined>(undefined)
  const [newLabel, setNewLabel] = useState("")
  const [newPrompt, setNewPrompt] = useState("")

  const openEditor = (id: string, label: string, prompt: string) => {
    setEditingNodeId(id)
    setNewLabel(label)
    setNewPrompt(prompt)
  }

  const closeEditor = () => {
    setEditingNodeId(undefined)
    setNewLabel("")
    setNewPrompt("")
  }

  if (!editingNodeId) {
    return null
  }

  const node = workflow?.nodes.find((n) => n.id === editingNodeId)

  if (!node) {
    closeEditor()
    return null
  }

  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg shadow-xl w-full max-w-sm z-50">
      <h3 className="text-lg font-semibold mb-6">Edit Decision Node</h3>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Label</label>
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          className="w-full border rounded p-2 focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="e.g. Support"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Prompt</label>
        <textarea
          value={newPrompt}
          onChange={(e) => setNewPrompt(e.target.value)}
          className="w-full border rounded p-2 focus:outline-none focus:ring-2 focus:ring-primary h-32 resize-y"
          rows={3}
          placeholder="e.g. Is this a support request?"
        ></textarea>
      </div>
      <div className="flex justify-end gap-3 mt-8">
        <button onClick={closeEditor} className="px-4 py-2 border rounded cancel:bg-gray-200">
          Cancel
        </button>
        <button
          onClick={() => {
            updateNode(editingNodeId, { label: newLabel, prompt: newPrompt })
            closeEditor()
          }}
          className="px-4 py-2 bg-primary text-white rounded"
        >
          Save
        </button>
      </div>
    </div>
  )
}