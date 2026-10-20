import { useWorkflowStore } from "@/store/workflow-store"
import { cn } from "@/lib/utils"

export const Toolbar = () => {
  const { addNode, setStartNode, removeNode, replace, workflow, setSelectedNodeId } = useWorkflowStore()

  return (
    <div className="fixed top-4 left-4 flex gap-2 z-50">
      <button
        onClick={() => {
          const newId = `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
          addNode(0, 0, "New Question")
          setSelectedNodeId(newId)
        }}
        className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
        title="Add Node"
      >
        +
      </button>
      <button
        onClick={() => setStartNode(workflow?.nodes[0]?.id ?? "")}
        className="px-3 py-1 bg-green-600 text-white rounded text-sm"
        disabled={!workflow?.nodes.length}
        title="Set as Start"
      >
        S
      </button>
      <button
        onClick={() => replace({ id: "yesno-flow", name: "yesno-flow", startNodeId: "", nodes: [], edges: [] })} 
        className="px-3 py-1 bg-gray-600 text-white rounded text-sm"
        title="Reset"
      >
        R
      </button>
    </div>
  )
}