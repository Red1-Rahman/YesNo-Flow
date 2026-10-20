---
name: inngest-workflow
description: Build and debug the Inngest execution layer. Use when editing the Inngest client, the run-workflow function, the /api/inngest route, the run store, or retry behavior.
---

# Inngest workflow execution

Verify exact API names against the current Inngest docs for the installed `inngest` version before coding. The patterns below are stable concepts, not a substitute for the docs.

## Setup

```ts
// src/inngest/client.ts
import { Inngest } from "inngest"
export const inngest = new Inngest({ id: "yesno-flow" })

// src/app/api/inngest/route.ts
import { serve } from "inngest/next"
import { inngest } from "@/inngest/client"
import { functions } from "@/inngest"
export const { GET, POST, PUT } = serve({ client: inngest, functions })
```

Dev server: `./console/inngest.sh` (points at `http://localhost:3000/api/inngest`).

## Core mental model

- The function body **re-executes from the top** on every step boundary. Completed `step.run` results are memoized.
- Code outside `step.run` must be deterministic and side effect free.
- One graph node visit equals one `step.run` with id `node:<nodeId>:visit:<n>`.

## Function skeleton

```ts
export const runWorkflow = inngest.createFunction(
  {
    id: "run-workflow",
    retries: 2,
    onFailure: async ({ event, error }) => {
      const { runId } = event.data.event.data
      updateRun(runId, { status: "failed", error: safeMessage(error), finishedAt: Date.now() })
    },
  },
  { event: "workflow/run.requested" },
  async ({ event, step }) => {
    const { runId, workflow, input } = RunRequestedSchema.parse(event.data)
    // loop described in docs/architecture.md
  }
)
```

## Inside a step

1. Record `running` for the node.
2. Call `decide({ prompt, input })`.
3. On success record `success` with the answer and duration, return the answer.
4. On failure record `error` (this logs each retry), then **rethrow** so Inngest retries.

Return only JSON serializable data from a step.

## Errors

| Situation | Use |
| --- | --- |
| Transient (429, 5xx, network) | Throw normally, Inngest retries |
| Invalid LLM output | Throw normally, a retry may fix it |
| Max steps exceeded, invalid graph | `NonRetriableError` |

## Testing locally

1. `./console/dev.sh`
2. Send a run from the UI or POST `/api/runs`.
3. Open http://localhost:8288 and inspect the run, steps, and retries.

## Pitfalls

- Duplicate step ids in a cycle: always include the visit counter.
- Writing to the store outside `step.run`: it will repeat on replay.
- Putting large payloads in step results: keep results to `"YES"` or `"NO"`.
- The in-memory run store only works when Inngest calls back into the same Next.js process (local dev).
