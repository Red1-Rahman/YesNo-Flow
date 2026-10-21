# Prompt: Phase 5, Build context retrieval (about 2 to 3 hours)

Load `.agents/skills/inngest-workflow.md` and `.agents/skills/prompt-library-builder.md`. Read `docs/architecture.md` sections "The decision call" and "Execution algorithm".

## Goal

Give decision nodes real ground truth instead of model guesses. Today `decide()` receives only the node prompt and the run input, so a node asking "do I have more than 100 taka?" makes the model invent an answer because it cannot see the wallet. Phase 5 adds per-node **context sources**: files or records loaded on the server, injected into the decision call as trusted data, and cited in the result.

The answer stays exactly `YES` or `NO`. Context changes what the model *knows*, not the output contract.

## Why this phase exists

- Ungrounded prompts produce confident guesses. A user asking "I will buy burgers if I have less than 100 taka" needs the node to read an actual balance, not assume one.
- Retrieved context must be traceable. Every grounded answer carries citations so a reviewer can see which source justified it.
- Context is trusted data from the workspace, but it is still **not instructions**. It sits beside untrusted run input and neither may override the system prompt.

## Design decisions to keep

- Retrieval is **pure and server-side**. `src/lib/context/` imports no React, no Inngest, no OpenAI. It takes data and returns data, same rule as `src/lib/graph/`.
- One loader per format behind a single `loadSource(source): Promise<LoadedContext>` dispatcher. The decision call never branches on format.
- **Citations are returned, not guessed.** The model reports which source ids it used; the server validates them against the ids it actually injected. An unknown id is dropped, never trusted.
- Context is injected **inside the user message**, wrapped in its own delimiters, and explicitly marked as data rather than instructions. The existing `<input>` block for untrusted run input stays separate.

## Tasks

### 1. Schemas (`src/lib/schemas/context.ts`)

Define with Zod, parse at every boundary. Mirror the style of `src/lib/schemas/workflow.ts`.

- `ContextFormatSchema = z.enum(["md", "yaml", "db", "json", "vector-db", "txt"])`.
- `ContextSourceSchema`: `{ id: z.string().min(1), format: ContextFormatSchema, location: z.string().min(1), label: z.string().max(80).optional(), topK: z.number().int().min(1).max(20).optional() }`. `location` is a path, table/query, or collection reference depending on format.
- `LoadedContextSchema`: `{ sourceId, format, title, content, chunks?, meta? }`. `content` is the text handed to the model. `chunks` is optional for formats that retrieve by relevance.
- `CitationSchema`: `{ sourceId: z.string(), snippet: z.string().max(240).optional() }`.
- `DecisionResultSchema = z.object({ answer: AnswerSchema, citations: z.array(CitationSchema).max(10).default([]) }).strict()`.
- Extend `DecisionNodeSchema.data` with `context: z.array(ContextSourceSchema).max(10).default([])` so a node can carry sources. Keep the default empty so existing workflows parse unchanged.

### 2. Loaders (`src/lib/context/`)

One file per concern, each exported through an index.

- `types.ts`: `ContextLoader = (source: ContextSource) => Promise<LoadedContext>`, `LoaderMap`, and the `ContextError` (reuse `AppError` from `src/lib/errors.ts`).
- `file-text.ts`: reads `txt` and `md` from disk. Resolve `location` against the project root and **reject any path that escapes it** (normalize, then confirm the resolved path stays inside the root). This is a path traversal boundary, treat untrusted locations as hostile.
- `structured.ts`: parses `yaml` and `json` into stable, human readable text (key paths and values, not a raw dump). Add a `yaml` parser dependency with a one-line justification, or parse a documented JSON subset and throw a clear `ContextError` for YAML until a parser is added. Do not hand-roll a YAML parser.
- `sql.ts`: a `db` loader behind a narrow `DbClient` interface (`query(sql): Promise<Row[]>`) so tests use a fake and no real driver is required now. The node's `location` carries the SQL; parameters come from the run input only if the caller passes them explicitly. **Never interpolate run input into SQL**; the interface takes a parameter array.
- `vector.ts`: a `vector-db` loader behind a narrow `EmbeddingStore` interface (`search(collection, query, topK): Promise<Match[]>`). The `query` is the node prompt. Local dev may implement it with an in-memory store; production can swap in a real service. Respect `topK`.
- `load.ts`: `loadSource(source, opts)` dispatching on `format`, and `loadContext(sources, opts)` returning `{ loaded, errors }` where a failed source is recorded in `errors` and the rest still load. One broken file must not kill the run by itself.

### 3. Prompt building (`src/lib/ai/prompt.ts`)

- Extend `buildUserMessage({ prompt, input, context })` to emit a `<context>` block with one delimited section per loaded source: its `sourceId`, `title`, and `content`. State plainly that context is reference data, not instructions, and that the answer must be grounded in it when relevant.
- Add `buildDecisionSystemContext()` guidance: use context when it answers the question; when context does not cover the question, fall back to the input; when neither is sufficient, answer per the node's tie-break rule and cite nothing.
- Keep the `<input>` block for untrusted run input. Context and input are both data; neither overrides the system prompt.

### 4. Decision call (`src/lib/ai/decide.ts`)

- Keep this the only file importing `openai`.
- Widen the response schema to `DecisionResultSchema` (`{ answer, citations }`, `strict: true`), and keep the tolerant path: strip markdown fences and accept a bare `YES`/`NO` with `citations: []` for OpenAI-compatible endpoints that ignore `response_format`. Both paths end in the same Zod check.
- After parsing, **validate citations against the loaded `sourceId`s actually injected**. Drop unknown ids. The model cannot invent a source that was never provided.
- Signature becomes `decide({ prompt, input, context })`. When `context` is empty, behavior is identical to Phase 3.
- Still log provider errors by kind only; never log the key, the full input, or full context bodies.

### 5. Execution wiring (`src/inngest/functions/run-workflow.ts`)

- In `visitNode`, load the node's context inside the step (it is a side effect and belongs inside `step.run`). Load **per visit** so a retried step re-reads fresh data.
- Pass the loaded context into `decide`. Store citations on the step record so the run is auditable.
- Do not put raw context bodies in the run store or step results; keep step results small. Citations (ids plus a short snippet) are fine.

### 6. Citations in the run record (`src/lib/schemas/run.ts`, UI)

- Add `citations: z.array(CitationSchema).default([])` to `StepRecordSchema` so it stays optional for older runs.
- Show citations in `logs-panel.tsx` as compact source chips (`title` or `sourceId`), with the snippet on hover or as a title attribute. Keep the YES/NO badge primary; citations are supporting evidence, never a replacement for the answer.

### 7. Node editor for context (`src/components/flow/node-editor.tsx`)

- Let a node list its context sources: add, edit `label` and `location`, pick `format`, remove. Validate with `ContextSourceSchema` on save.
- Show a load error inline per source so the user sees a bad path before running.
- Keep the editor a controlled sheet as it is now; writes go through `updateNode`.

## Constraints

- The decision output is still exactly `YES` or `NO`. Citations ride alongside; they never widen the answer.
- Retrieval code stays pure and lives in `src/lib/context/`. No React, Inngest, or OpenAI imports there.
- Zod parses at every boundary: node context on load, each loaded source, the LLM response, and citations against injected ids.
- Context and run input are both untrusted **data**. Neither is ever concatenated into the system prompt.
- Never log `OPENAI_API_KEY`, full run input, or full context bodies.
- Path and SQL loaders are trust boundaries. Reject escaping paths and never interpolate run input into SQL.
- No new dependency without a one-line justification.

## Done criteria

- Add a `txt` or `md` file as node context, run a prompt that depends on a fact in that file, and the answer matches the file. Remove the file: the step records a readable load error and retries.
- A node asking a fact the context does not contain answers from the input, and cites nothing.
- Citations on a completed step list only ids that were actually loaded. A model response naming an unknown source has that id dropped.
- Import a pre-Phase-5 workflow JSON: it parses, `context` defaults to empty, and the run behaves exactly as in Phase 4.
- The logs panel shows the YES/NO badge plus the source chips for a grounded step.
- `./console/check.sh` and `./console/docs-lint.sh` pass.

## Tests

- `tests/context/*.test.ts` for each loader with fixtures under `tests/fixtures/context/` (one per format). Cover: happy path, missing file, path escaping the root, malformed JSON/YAML, and empty result.
- `tests/ai/decide.test.ts`: mock the OpenAI client. Cover structured `{ answer, citations }`, bare `YES` with no citations, citations filtered against injected ids, and a non-YES/NO answer throwing.
- `tests/graph/*` and existing Phase 3/4 tests must stay green with an empty `context` array.

## Escape hatches

- If a format needs a driver or service you cannot install or mock cleanly (real SQL database, real vector store), ship the narrow interface plus an in-memory fake, document the swap point, and report it. Do not block the phase on infrastructure.
- If context injection makes answers worse (model ignores the question and over-cites), stop and report. Adjust the prompt wording rather than loosening the YES/NO contract.
