---
name: react-flow-implementation
description: Implements React Flow node-based UIs correctly using @xyflow/react. Use when building the canvas, custom nodes, custom edges, handles, state management, or viewport control in this project.
---

# React Flow implementation

Adapted for yesno-flow. Package: `@xyflow/react`. Always import `@xyflow/react/dist/style.css` once.

## Project specifics

- One node type: `decision`. Two source handles (`id="yes"`, `id="no"`) and one target handle.
- Two edge types: `yes` and `no`. Edge type always equals its `sourceHandle`.
- Source of truth for the graph is the Zustand store, not React Flow internal state. Use the controlled pattern.

## Types

```tsx
import type { Node, Edge, NodeProps } from "@xyflow/react"

type DecisionNodeData = { label: string; prompt: string }
type DecisionNode = Node<DecisionNodeData, "decision">
type BranchEdge = Edge<{}, "yes" | "no">
```

## Custom node (memoized, handles for both branches)

```tsx
import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"

export const DecisionNodeView = memo(function DecisionNodeView(
  { data, selected }: NodeProps<DecisionNode>
) {
  return (
    <div className={cn("rounded-lg border bg-card p-3", selected && "ring-2 ring-primary")}>
      <Handle type="target" position={Position.Top} />
      <p className="text-sm font-medium">{data.label || "Decision"}</p>
      <p className="text-xs text-muted-foreground line-clamp-3">{data.prompt}</p>
      <Handle type="source" position={Position.Bottom} id="yes" style={{ left: "30%" }} />
      <Handle type="source" position={Position.Bottom} id="no" style={{ left: "70%" }} />
    </div>
  )
})

// Define OUTSIDE any component
export const nodeTypes = { decision: DecisionNodeView }
export const edgeTypes = { yes: BranchEdgeView, no: BranchEdgeView }
```

## Connecting: derive the edge type from the handle

```tsx
const onConnect = useCallback((c: Connection) => {
  if (!c.source || !c.target || !c.sourceHandle) return
  const branch = c.sourceHandle as "yes" | "no"
  addEdge({ id: nanoid(), source: c.source, target: c.target, sourceHandle: branch, type: branch })
}, [addEdge])
```

## Connection validation

```tsx
const isValidConnection = useCallback((c: Connection | Edge) => {
  if (c.source === c.target) return false
  // one outgoing edge per branch per node
  return !edges.some(e => e.source === c.source && e.sourceHandle === c.sourceHandle)
}, [edges])
```

## Controlled state

```tsx
const onNodesChange = useCallback((changes: NodeChange[]) =>
  setNodes(nds => applyNodeChanges(changes, nds)), [])
const onEdgesChange = useCallback((changes: EdgeChange[]) =>
  setEdges(eds => applyEdgeChanges(changes, eds)), [])
```

## Visualizing execution

- Compute node and edge visual state with a pure function from the run state, then merge into `className` or `data`, do not mutate the stored graph.
- Animate an edge with `animated: true` only while it is the active path.
- Color: YES green, NO red, running blue, error amber. Pair with an icon.

## Interaction classes

| Class | Effect |
| --- | --- |
| `nodrag` | Do not drag when pressing this element |
| `nowheel` | Do not zoom on wheel over this element |
| `nopan` | Do not pan from this element |
| `nokey` | Ignore key events (use on inputs) |

## Viewport

```tsx
<ReactFlow fitView fitViewOptions={{ padding: 0.2, maxZoom: 1 }} minZoom={0.2} maxZoom={2} />
const { fitView } = useReactFlow()   // requires <ReactFlowProvider>
```

## Checklist

- [ ] `nodeTypes` and `edgeTypes` are module constants
- [ ] Custom nodes wrapped in `memo`
- [ ] Parent has explicit height
- [ ] Inputs inside nodes carry `nodrag nowheel nokey`
- [ ] Edge type equals source handle
- [ ] Graph parsed with `WorkflowSchema` on import
