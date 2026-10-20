# Prompt: Phase 4, Build polish (about 2 hours)

Load `.agents/skills/react-flow-implementation.md` and `.agents/skills/shadcn-ui.md`.

## Goal

Improve usability and reliability. Chosen features (at least 3 required, all 5 targeted):

1. Visual execution state on nodes.
2. Animated active edges.
3. Execution logs panel.
4. JSON export and import.
5. Error handling with retry visibility.

## Tasks

### 1. Visual execution state
Implement `derive-visual-state.ts` (pure, tested). Node states: `idle`, `running`, `success-yes`, `success-no`, `error`. Render with border color plus icon plus small text.

### 2. Animated active edges
Animate the edge from the last finished node along its chosen branch while the target is running or pending. Dim edges not taken.

### 3. Logs panel
`logs-panel.tsx`: ordered steps with node label, answer badge, duration, attempt number, and error text. Auto-scroll to newest. Clicking a row selects the node on the canvas.

### 4. JSON export and import
Export downloads `workflow-<name>.json`. Import reads a file, parses with `WorkflowSchema`, shows readable Zod issues on failure through a toast, and never replaces the store on failure. Confirm before replacing a non-empty graph.

### 5. Error handling
Show run level error banner with a safe message. Show per-step error rows for each failed attempt. Add a "Run again" button that reuses the last input. Handle polling failures with backoff and a visible "connection lost" state.

## Constraints

- Do not store run state in the workflow store.
- Do not use color alone to convey status.
- Keep polling interval 700 ms, stop on terminal status and on unmount.

## Done criteria

- Run the example: nodes light up in order, active edge animates, logs fill in.
- Export, edit file by hand, import: graph updates. Import a broken file: clear error, graph unchanged.
- Remove `OPENAI_API_KEY` and run: readable error, no crash.
- `./console/check.sh` and `./console/docs-lint.sh` pass.

## Stretch (only if time remains)

Execution history list (last 10 runs from localStorage, view a past run's logs).
