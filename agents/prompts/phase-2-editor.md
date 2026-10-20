# Prompt: Phase 2, Foundations (about 2 hours)

Load `.agents/skills/react-flow-implementation.md` and `.agents/skills/shadcn-ui.md`. Read `docs/codebase.md` for schemas.

## Goal

An interactive flow editor with editable prompt nodes, YES and NO edge types, and local persistence.

## Tasks

1. Implement Zod schemas in `src/lib/schemas/workflow.ts` exactly as in `docs/codebase.md`.
2. Implement `src/lib/graph/validate.ts` (invariants listed in `docs/architecture.md`) and `src/lib/graph/traverse.ts`. Write tests in `tests/graph/` first.
3. Implement `src/store/workflow-store.ts` with Zustand `persist` (key `yesno-flow:workflow:v1`). Actions: `addNode`, `updateNode`, `removeNode`, `addEdge`, `removeEdge`, `setStartNode`, `applyNodeChanges`, `applyEdgeChanges`, `reset`, `replace(workflow)`.
4. Build `flow-canvas.tsx`, `decision-node.tsx` (two source handles), `branch-edge.tsx` (green YES, red NO, label on edge), `node-editor.tsx` (Sheet with label and prompt), `toolbar.tsx` (Add node, Set as start, Reset).
5. Selecting a node opens the editor. Edits write to the store immediately.
6. Seed the store with the example: "Is this a support request?" with YES to "Support node" and NO to "Sales node".
7. Mark the start node visually (badge).

## Constraints

- `nodeTypes` and `edgeTypes` are module constants.
- Edge type derives from `sourceHandle`.
- Reject a second outgoing edge on the same handle.
- No run or Inngest code in this phase.

## Done criteria

- Add, drag, connect, edit, delete nodes in the browser.
- Reload the page, the graph is restored.
- `tests/graph/*.test.ts` pass.
- `./console/check.sh` and `./console/docs-lint.sh` pass.

## Escape hatches

If React Flow internal state and the store fight each other (jumping nodes), stop and switch to the controlled pattern from the skill instead of adding workarounds.
