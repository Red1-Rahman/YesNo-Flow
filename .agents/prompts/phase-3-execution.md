# Prompt: Phase 3, Build core (about 2 hours)

Load `.agents/skills/inngest-workflow.md`. Read `docs/architecture.md` sections "Execution algorithm", "The decision call", and "Error handling".

## Goal

Execute the workflow through Inngest. Each node is one step, the LLM answers YES or NO, and the answer chooses the edge.

## Tasks

1. `src/lib/ai/prompt.ts`: export the system prompt (mirror `.agents/prompts/decision-node-system.md`) and `buildUserMessage({ prompt, input })` that wraps input in `<input>` delimiters.
2. `src/lib/ai/decide.ts`: call OpenAI with `temperature: 0`, structured output JSON schema `{ answer: "YES" | "NO" }` (`strict: true`), then validate with `AnswerSchema`. Throw on anything else. This is the only file importing `openai`. Test with a mocked client.
3. `src/lib/schemas/run.ts` and `events.ts` as in `docs/codebase.md`.
4. `src/lib/run-store.ts`: `createRun`, `appendStep`, `updateRun`, `getRun`, backed by `globalThis` Map.
5. `src/inngest/functions/run-workflow.ts`: implement the loop. Step id `node:<id>:visit:<n>`. Enforce `WORKFLOW_MAX_STEPS`. Use `NonRetriableError` for invalid graph and max steps. Add `onFailure`.
6. `POST /api/runs`: parse body with `RunRequestedSchema`-like schema, run `validateWorkflow`, create run, `inngest.send`, return `{ runId }` (400 with issues on invalid graph, 500 with safe message on send failure).
7. `GET /api/runs/[runId]`: return run state or 404.
8. Minimal UI: a run input textarea, Run button, and a plain list of step records (polished in Phase 4).
9. `src/lib/graph/derive-visual-state.ts` can wait for Phase 4.

## Constraints

- Side effects only inside `step.run`.
- Never log the API key or full user input in server logs.
- Keep step results to the string `"YES"` or `"NO"`.

## Done criteria

- With the seeded example and input "My order arrived broken, please help", the log shows node 1 YES then Support node.
- With input "How much does the enterprise plan cost?" it goes NO then Sales node.
- A graph with a cycle stops with a clear max steps error.
- The Inngest dashboard shows one step per visited node.
- `./console/check.sh` and `./console/docs-lint.sh` pass.

## Escape hatches

If the run state never updates in the UI, check that Inngest is calling `http://localhost:3000/api/inngest` (same process as the store). Do not add a database to work around it, report instead.