# YesNo-Flow

A visual AI workflow builder. Every node is an AI decision step that answers **YES** or **NO**. The graph is edited on a React Flow canvas and executed durably by Inngest, one node per Inngest step.

```
"Is this a support request?"
   YES -> Support node
   NO  -> Sales node
```

## Stack

| Concern | Choice |
| --- | --- |
| App | Next.js (App Router) + TypeScript |
| Canvas | React Flow (`@xyflow/react`) |
| Execution | Inngest (one node = one `step.run`) |
| LLM | OpenAI SDK, structured output constrained to `YES` or `NO` |
| UI | shadcn/ui + Tailwind |
| State | Zustand with `persist` (localStorage) |
| Validation | Zod at every boundary (TypeScript counterpart of Pydantic models) |
| Tests | Vitest |

## Quick start

macOS, Linux, Git Bash, WSL:

```bash
./console/setup.sh          # install deps, create .env.local
# add OPENAI_API_KEY to .env.local
./console/dev.sh            # Next.js on :3000 and Inngest dev server on :8288
```

Windows PowerShell:

```powershell
.\console\setup.ps1
# add OPENAI_API_KEY to .env.local
.\console\dev.ps1
```

If PowerShell blocks the scripts, run them once with `powershell -ExecutionPolicy Bypass -File .\console\dev.ps1`, or allow local scripts with `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

Open http://localhost:3000 for the editor and http://localhost:8288 for the Inngest dashboard.

## Console scripts

Every script exists as `.sh` and `.ps1` with identical behavior.

| Script | Purpose |
| --- | --- |
| `console/setup` (.sh, .ps1) | One-time setup |
| `console/dev` (.sh, .ps1) | Run app and Inngest together |
| `console/inngest` (.sh, .ps1) | Run only the Inngest dev server |
| `console/check` (.sh, .ps1) | Typecheck, lint, test (the verification gate) |
| `console/docs-lint` (.sh, .ps1) | Fail on em dashes in markdown |
| `console/clean` (.sh, .ps1) | Remove build output and local run data |

## How it works

1. Build a graph: add decision nodes, write a yes/no question in each, connect the **YES** handle (green) and **NO** handle (red) to the next node.
2. Press **Run**, provide the input text to classify, and the app sends a `workflow/run.requested` event to Inngest.
3. The Inngest function walks the graph. Each visited node calls the LLM with the node prompt plus the input, receives `YES` or `NO`, and follows the matching edge.
4. The UI polls the run state and highlights the active node, animates the active edge, and fills the logs panel.

Full details: [docs/architecture.md](docs/architecture.md) and [docs/codebase.md](docs/codebase.md).

## Phases

| Phase | Hours | Outcome |
| --- | --- | --- |
| 1 Setup | 1 | App, Inngest dev server, README |
| 2 Foundations | 2 | Editable canvas, YES and NO edges, local persistence |
| 3 Build (core) | 2 | End-to-end execution with AI branching |
| 4 Build (polish) | 2 | Execution state, logs panel, JSON import and export, animated edges, error handling |
| 5 Context retrieval | 3 | Per-node context files, database and vector interfaces, verified citations, import and preview |

## Working with coding agents

Read [AGENTS.md](AGENTS.md) first. Reusable skills live in `.agents/skills/`, phase prompts in `.agents/prompts/`.

## License

Apache License 2.0. Copyright 2026 Redwan Rahman. See [LICENSE](LICENSE).
