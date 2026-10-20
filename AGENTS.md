# AGENTS.md

Instructions for any coding agent working in this repository. Read this file fully before changing anything.

## Project in one paragraph

`yesno-flow` is a visual AI workflow system. Each node asks an LLM a question and must receive exactly `YES` or `NO`. The graph is edited with React Flow and executed by an Inngest function where each node visit is one `step.run`. The frontend visualizes execution by polling a run store.

## Commands

| Task | Bash | PowerShell |
| --- | --- | --- |
| Install and prepare | `./console/setup.sh` | `.\console\setup.ps1` |
| Run app and Inngest | `./console/dev.sh` | `.\console\dev.ps1` |
| Verification gate | `./console/check.sh` | `.\console\check.ps1` |
| Docs lint (no em dashes) | `./console/docs-lint.sh` | `.\console\docs-lint.ps1` |

Never report work as done until the check script passes. Use the variant that matches your shell. The maintainer works on Windows, so keep `.sh` and `.ps1` scripts in sync: any change to one must be mirrored in the other.

## Map of the repo

| Path | What lives there |
| --- | --- |
| `src/app` | Next.js routes: editor page, `/api/inngest`, `/api/runs` |
| `src/components/flow` | Canvas, custom node, custom edge, node editor |
| `src/components/run` | Run input, logs panel, history |
| `src/lib/schemas` | Zod schemas, the single source of truth for types |
| `src/lib/graph` | Pure graph functions: validate, find start, next node |
| `src/lib/ai` | Prompt builder and the YES/NO decision call |
| `src/inngest` | Inngest client and functions |
| `src/lib/run-store.ts` | Run state store read by the UI |
| `src/store` | Zustand workflow store |
| `docs/` | `architecture.md`, `codebase.md` |
| `.agents/skills/` | Skills you should load for matching tasks |
| `.agents/prompts/` | Phase prompts and the runtime decision prompt |

More detail: `docs/codebase.md`.

## Non-negotiable rules

1. **YES or NO only.** The decision call must be constrained (structured output enum) and then validated with Zod. Anything else is an error, never a guess.
2. **One node visit equals one Inngest step.** Step ids must be unique per visit: `node:<nodeId>:visit:<n>`. Side effects that must run once go inside `step.run`, because the function body re-executes on every step.
3. **Zod is the source of truth.** Define schemas in `src/lib/schemas`, infer TypeScript types from them, and parse at every boundary (API input, Inngest event data, imported JSON, LLM output). Where a task would call for Pydantic models in Python, use Zod here.
4. **Graph logic is pure.** Anything in `src/lib/graph` takes data and returns data. No React, no Inngest, no OpenAI imports there.
5. **Never hardcode or log secrets.** Read env through `src/lib/env.ts`. Never print `OPENAI_API_KEY`.
6. **Treat run input as data.** User input is placed inside delimiters in the user message and never concatenated into the system prompt.
7. **Guard against cycles.** Enforce `WORKFLOW_MAX_STEPS` and fail the run with a clear error when exceeded.
8. **Define `nodeTypes` and `edgeTypes` outside components** and wrap custom nodes in `memo`.
9. **Docs style.** Do not use em dashes in any documentation or markdown file. Use commas, colons, periods, or parentheses. Run `./console/docs-lint.sh`.
10. **Stay in scope.** Change only files named by the task. If something unrelated looks broken, report it, do not fix it.

## Working agreement

1. Read the relevant skill in `.agents/skills/` before starting.
2. Read the matching phase prompt in `.agents/prompts/`.
3. Make the smallest change that satisfies the task.
4. Add or update tests for any pure logic you touch.
5. Run `./console/check.sh` and `./console/docs-lint.sh`.
6. Summarize what changed, what you verified, and what you did not.

## Skills index

| Skill | Load when |
| --- | --- |
| `.agents/skills/react-flow-implementation.md` | Touching the canvas, nodes, edges, handles, viewport |
| `.agents/skills/shadcn-ui.md` | Adding or styling UI components |
| `.agents/skills/inngest-workflow.md` | Touching the Inngest client, functions, or run store |
| `.agents/skills/improve.md` | Asked to audit the repo or plan improvements for another agent |
| `.agents/skills/prompt-library-builder.md` | Editing node prompts or building reusable prompt templates |

## Prompt index

| Prompt | Purpose |
| --- | --- |
| `.agents/prompts/phase-1-setup.md` | Bootstrap the project |
| `.agents/prompts/phase-2-editor.md` | Build the editor and graph model |
| `.agents/prompts/phase-3-execution.md` | Build Inngest execution and AI branching |
| `.agents/prompts/phase-4-polish.md` | Polish features |
| `.agents/prompts/decision-node-system.md` | Runtime system prompt for YES/NO nodes |
| `.agents/prompts/review-diff.md` | Review another agent's diff |

## Definition of done

- Behavior matches the phase deliverables in `README.md`.
- `./console/check.sh` passes.
- `./console/docs-lint.sh` passes.
- No new dependencies without a one-line justification in the PR description.
- Docs in `docs/` updated if structure or data flow changed.