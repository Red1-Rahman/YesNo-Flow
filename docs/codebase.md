# Codebase guide

The target layout. Create files as phases require them.

```
yesno-flow/
  AGENTS.md
  README.md
  LICENSE
  package.json
  .env.example
  components.json              shadcn config
  console/                     shell scripts
  docs/                        architecture.md, codebase.md
  .agents/skills/              task skills for agents
  agents/prompts/              phase prompts, runtime prompt
  src/
    app/
      layout.tsx
      page.tsx                 editor + run panel
      api/
        inngest/route.ts       serve({ client, functions })
        runs/route.ts          POST: validate, create run, send event
        runs/[runId]/route.ts  GET: run state
    components/
      flow/
        flow-canvas.tsx        <ReactFlow> wiring
        decision-node.tsx      custom node, 2 source handles
        branch-edge.tsx        custom edge, color by type
        node-editor.tsx        side sheet to edit label and prompt
        toolbar.tsx            add node, export, import, reset
      run/
        run-panel.tsx          input box, run button, status
        logs-panel.tsx         ordered step records
      ui/                      shadcn generated components
    hooks/
      use-run-polling.ts
    inngest/
      client.ts
      functions/run-workflow.ts
      index.ts                 exports functions array
    lib/
      env.ts                   Zod-validated env
      run-store.ts
      utils.ts                 cn()
      schemas/
        workflow.ts
        run.ts
        events.ts
      graph/
        validate.ts
        traverse.ts
        derive-visual-state.ts
      ai/
        prompt.ts
        decide.ts
    store/
      workflow-store.ts        Zustand + persist
  tests/
    graph/validate.test.ts
    graph/traverse.test.ts
    ai/decide.test.ts
    schemas/workflow.test.ts
```

## Core schemas (reference)

```ts
// src/lib/schemas/workflow.ts
import { z } from "zod"

export const AnswerSchema = z.enum(["YES", "NO"])
export type Answer = z.infer<typeof AnswerSchema>

export const BranchSchema = z.enum(["yes", "no"])
export type Branch = z.infer<typeof BranchSchema>

export const DecisionNodeSchema = z.object({
  id: z.string().min(1),
  type: z.literal("decision"),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.object({
    label: z.string().max(80).default(""),
    prompt: z.string().min(1).max(4000),
  }),
})

export const BranchEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: BranchSchema,
  type: BranchSchema,
})

export const WorkflowSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  startNodeId: z.string().min(1),
  nodes: z.array(DecisionNodeSchema).min(1).max(100),
  edges: z.array(BranchEdgeSchema).max(200),
})
export type Workflow = z.infer<typeof WorkflowSchema>
```

```ts
// src/lib/schemas/run.ts
export const StepStatusSchema = z.enum(["running", "success", "error"])

export const StepRecordSchema = z.object({
  nodeId: z.string(),
  visit: z.number().int().positive(),
  attempt: z.number().int().nonnegative(),
  status: StepStatusSchema,
  answer: AnswerSchema.optional(),
  error: z.string().optional(),
  startedAt: z.number(),
  durationMs: z.number().optional(),
})

export const RunStatusSchema = z.enum(["queued", "running", "succeeded", "failed"])

export const RunStateSchema = z.object({
  runId: z.string(),
  status: RunStatusSchema,
  input: z.string(),
  startedAt: z.number(),
  finishedAt: z.number().optional(),
  steps: z.array(StepRecordSchema),
  outcomeNodeId: z.string().optional(),
  error: z.string().optional(),
})
```

```ts
// src/lib/schemas/events.ts
export const RunRequestedSchema = z.object({
  runId: z.string(),
  workflow: WorkflowSchema,
  input: z.string().min(1).max(8000),
})
```

## Module contracts

| Module | Exports | Rules |
| --- | --- | --- |
| `graph/validate.ts` | `validateWorkflow(w): { ok: true } or { ok: false, issues: string[] }` | Pure, no I/O |
| `graph/traverse.ts` | `findNextEdge(w, nodeId, answer)`, `getNode(w, id)` | Pure |
| `graph/derive-visual-state.ts` | `deriveNodeStates(run)`, `deriveEdgeStates(w, run)` | Pure, used by the canvas |
| `ai/decide.ts` | `decide({ prompt, input, signal? }): Promise<Answer>` | Only file that imports `openai` |
| `run-store.ts` | `createRun`, `appendStep`, `updateRun`, `getRun` | Keep the interface storage agnostic |
| `inngest/functions/run-workflow.ts` | `runWorkflow` | Only file that defines the traversal loop |
| `store/workflow-store.ts` | `useWorkflowStore` | Holds the graph only, never run state |

## Conventions

- TypeScript strict mode. No `any`. Prefer `unknown` and parse with Zod.
- Named exports. One component per file, filename in kebab-case.
- Custom node and edge components wrapped in `memo`. `nodeTypes` and `edgeTypes` are module-level constants.
- Interactive elements inside nodes carry `nodrag`, inputs carry `nodrag nowheel nokey`.
- UI built from shadcn components. Styling through Tailwind classes and `cn()`.
- Colors: YES is green, NO is red, running is blue, error is amber. Never rely on color alone, pair with an icon or label.
- Errors shown to users come from a typed `AppError` with a safe message. Raw provider errors are logged server side only.
- Tests sit in `tests/` mirroring `src/lib`. Mock `openai` in `decide` tests.

## Environment variables

| Name | Where | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | server | OpenAI auth |
| `OPENAI_MODEL` | server | Model id, default `gpt-4o-mini` |
| `INNGEST_DEV` | server | `1` for local dev server |
| `INNGEST_BASE_URL` | server | Dev server URL |
| `INNGEST_EVENT_KEY` | server | Production event key |
| `INNGEST_SIGNING_KEY` | server | Production request verification |
| `NEXT_PUBLIC_APP_URL` | client | Base URL |
| `WORKFLOW_MAX_STEPS` | server | Visit cap per run, default 25 |

## Testing map

| Behavior | Test |
| --- | --- |
| Reject missing start, dangling edges, duplicate branches | `validate.test.ts` |
| Pick correct edge for YES and NO, handle missing branch | `traverse.test.ts` |
| Accept only YES or NO, throw on anything else | `decide.test.ts` |
| Import rejects malformed JSON | `workflow.test.ts` |

## Where to start (suggested build order)

1. Schemas and graph pure functions with tests.
2. Workflow store and canvas.
3. `decide` with mocked OpenAI test.
4. Inngest function and `/api/runs`.
5. Polling hook, visual state, logs.
6. Import and export, error display.
