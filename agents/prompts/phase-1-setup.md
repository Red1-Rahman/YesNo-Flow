# Prompt: Phase 1, Setup (about 1 hour)

You are implementing Phase 1 of yesno-flow. Read `AGENTS.md`, `docs/architecture.md`, and `docs/codebase.md` first.

## Goal

A running frontend, a working Inngest dev server, and an initialized repository with a README.

## Tasks

1. Create a Next.js App Router project with TypeScript, Tailwind, and ESLint. Keep the existing `README.md`, `AGENTS.md`, `LICENSE`, `console/`, `docs/`, `.agents/`, `agents/`, `.gitignore`, and `package.json` intact (merge dependencies, do not overwrite).
2. Install and configure: `@xyflow/react`, `inngest`, `openai`, `zod`, `zustand`, shadcn/ui (load `.agents/skills/shadcn-ui.md`).
3. Create `src/lib/env.ts`: a Zod schema that parses `process.env` and exports a typed `env`. Fail fast with a readable message when `OPENAI_API_KEY` is missing at use time (not at import time, so the editor still loads without a key).
4. Create `src/inngest/client.ts`, `src/inngest/index.ts`, and `src/app/api/inngest/route.ts` with one `hello-world` function triggered by `app/hello`.
5. Create the folder structure from `docs/codebase.md` with empty placeholder files only where needed to compile.
6. Make `src/app/page.tsx` render a placeholder page with a heading.

## Out of scope

Canvas, node logic, LLM calls, run store.

## Done criteria

- `./console/setup.sh` completes.
- `./console/dev.sh` serves http://localhost:3000 and the Inngest UI on http://localhost:8288, and the dashboard lists the `hello-world` function.
- `./console/check.sh` passes.
- `./console/docs-lint.sh` passes.

## Escape hatches

- If the installed `inngest` API differs from `.agents/skills/inngest-workflow.md`, follow the installed version's docs and update the skill file.
- If `shadcn init` asks to overwrite `package.json` scripts, decline and keep ours.

## Report

List files created, commands run with results, and anything you deferred.
