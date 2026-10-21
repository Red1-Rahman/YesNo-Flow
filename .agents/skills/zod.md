---
name: zod
description: Zod v4 patterns for yesno-flow. Use when defining or changing any schema, parsing at a boundary (API route, Inngest event, imported JSON, LLM output, env, persisted store), formatting validation errors, writing schema tests, or deriving a JSON schema. Baseline is zod ^4.6.0.
triggers:
  - zod
  - schema
  - safeParse
  - z.infer
  - validation
---

# Zod (v4) in yesno-flow

Merged and trimmed from two community Zod skills, rewritten for this repo. Zod is the TypeScript counterpart of Pydantic models here: schemas define the shape, parsing validates, and types are inferred from the schema.

**Version warning.** Your memory of Zod is probably v3. This project targets **zod ^4.6.0** (`package.json` must say so). v4 changed string formats, error handling, defaults, and records. When memory and this file disagree, follow this file and the installed version's types.

## Pydantic to Zod map

| Pydantic | Zod |
| --- | --- |
| `class M(BaseModel)` | `const M = z.object({...})` and `type M = z.infer<typeof M>` |
| `model_validate(data)` | `M.parse(data)` or `M.safeParse(data)` |
| `Field(min_length=1, max_length=80)` | `z.string().min(1).max(80)` |
| `Field(default=...)` | `.default(...)` |
| `model_config = {"extra": "forbid"}` | `z.strictObject({...})` |
| `field_validator`, `model_validator` | `.refine()`, `.check()`, `.superRefine()` |
| `Literal["YES", "NO"]` | `z.enum(["YES", "NO"])` |
| `model_json_schema()` | `z.toJSONSchema(M)` |

## Where schemas live

| File | Schemas |
| --- | --- |
| `src/lib/schemas/workflow.ts` | `AnswerSchema`, `BranchSchema`, `DecisionNodeSchema`, `BranchEdgeSchema`, `WorkflowSchema` |
| `src/lib/schemas/run.ts` | `StepRecordSchema`, `RunStatusSchema`, `RunStateSchema` |
| `src/lib/schemas/events.ts` | `RunRequestedSchema` |
| `src/lib/schemas/context.ts` (Phase 5) | `ContextSourceSchema`, `NodeContextSchema`, `LoadedContextSchema`, `CitationSchema`, `DecisionResultSchema` |
| `src/lib/env.ts` | env schema |

Rules: one place per schema, export the schema and its inferred type together, never hand-write a type that a schema already describes.

## The boundaries (parse at every one)

| Boundary | Method | On failure |
| --- | --- | --- |
| `POST /api/runs`, `POST /api/context` bodies and queries | `safeParse` | 400 with `z.flattenError(error)` |
| Inngest event data inside the function | `safeParse` | `throw new NonRetriableError(z.prettifyError(error))` (retrying cannot fix a bad payload) |
| LLM output | `safeParse` after extraction | throw a normal `Error`, so Inngest retries |
| Workflow JSON import | `safeParse` | toast with `z.prettifyError(error)`, store untouched |
| Persisted Zustand state | `safeParse` in `migrate` and on rehydrate | reset to the seed workflow, never crash |
| Registries and context files (json, yaml) | `safeParse` | `ContextError` with a safe message |
| `process.env` | parse once in `src/lib/env.ts` | readable error naming the variable |

Never pass `JSON.parse(...)` output on without a schema. Type it `unknown` first.

## Core rules

### 1. Prefer `safeParse` for untrusted data

```ts
const result = WorkflowSchema.safeParse(raw)
if (!result.success) {
  return Response.json({ issues: z.flattenError(result.error) }, { status: 400 })
}
const workflow = result.data // typed
```

`parse()` is fine where a throw is the right outcome (env at startup, trusted internal data in tests).

### 2. Infer types, do not duplicate

```ts
export const AnswerSchema = z.enum(["YES", "NO"])
export type Answer = z.infer<typeof AnswerSchema>
```

Use `z.input<typeof S>` for the pre-transform and pre-default shape (form values, import payloads) and `z.output` or `z.infer` for the parsed shape.

### 3. Objects: choose the unknown-keys policy on purpose

- `z.object()` strips unknown keys. Use it for imports where forward compatibility matters.
- `z.strictObject()` rejects unknown keys. Use it for the LLM response (`DecisionResultSchema`) and API bodies.
- `z.looseObject()` keeps them. Rarely wanted here.

Do not write `.strict()` or `.passthrough()` in new code. They still work but are the older spelling.

### 4. Use the v4 top-level string formats

```ts
z.url()      // not z.string().url()
z.email()    // not z.string().email()
z.uuid()
z.stringbool() // "true" | "false" | "1" | "0" ... to boolean
```

Never use `z.coerce.boolean()` for env flags: it turns the string `"false"` into `true`. Use `z.stringbool()`.

### 5. Defaults behave differently in v4

`.default(value)` short-circuits: the value is returned as the **output** and is not parsed again. For nested objects whose fields have their own defaults, use `.prefault()` so the default is parsed:

```ts
// data.context may be missing in pre-Phase-5 workflows
context: NodeContextSchema.prefault({}),   // inner defaults fill sources and requireCitation
```

Use `.default()` for plain values (`z.string().default("")`, `z.boolean().default(true)`).

### 6. Records need two arguments

```ts
z.record(z.string(), z.unknown())   // v4
```

### 7. Discriminated unions for tagged data

```ts
const Event = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("hello"), name: z.string() }),
  z.strictObject({ type: z.literal("run"), runId: z.string() }),
])
```

### 8. Refinements: validate, do not throw

```ts
const NodeContextSchema = z
  .object({ sources: z.array(ContextSourceSchema).max(10).default([]), requireCitation: z.boolean().default(false) })
  .superRefine((val, ctx) => {
    const seen = new Set<string>()
    val.sources.forEach((s, i) => {
      if (seen.has(s.id)) {
        ctx.addIssue({ code: "custom", message: `Duplicate source id "${s.id}"`, path: ["sources", i, "id"] })
      }
      seen.add(s.id)
    })
  })
```

- Always give cross-field issues a `path` so the UI can show them next to the field.
- Never `throw` inside `.refine()` or `.transform()`.
- `.refine()` for a boolean check, `.transform()` for conversion, `.pipe()` for staged parsing.
- If the installed 4.x marks `.superRefine()` as deprecated, switch to `.check()`. Behavior is the same.
- Async refinements require `parseAsync` or `safeParseAsync`. Avoid them in schemas; do I/O in the loader instead.

### 9. Errors: v4 API only

```ts
z.flattenError(error)   // { formErrors, fieldErrors }  good for API 400 bodies and forms
z.treeifyError(error)   // nested structure             good for the editor
z.prettifyError(error)  // readable multi-line string   good for toasts and Inngest errors
```

Do not use `error.format()` or `error.flatten()` (deprecated), and do not use `required_error`, `invalid_type_error`, or `errorMap` (removed). Custom messages use the `error` option:

```ts
z.string({ error: "Prompt is required" }).min(1, { error: "Prompt cannot be empty" })
```

Never enable `reportInput` in production. It copies the offending input, which may be a user prompt or context content, into the error.

### 10. Env parsing

```ts
const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v)

export const EnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1).optional(),                       // checked at use time, not import time
  OPENAI_BASE_URL: z.preprocess(emptyToUndefined, z.url().optional()),
  OPENAI_MODEL: z.string().min(1).default("gpt-4o-mini"),
  WORKFLOW_MAX_STEPS: z.coerce.number().int().min(1).max(200).default(25),
  CONTEXT_UPLOADS_ENABLED: z.preprocess(emptyToUndefined, z.stringbool().optional()),
})
```

An empty `VAR=` line in `.env` is an empty string, not unset. Treat it as unset explicitly.

### 11. Recursive schemas

Use the getter pattern. There are none in this repo yet, so do not add one without a reason.

### 12. Branded ids (optional)

```ts
const NodeId = z.string().min(1).brand<"NodeId">()
```

Use only if mixing node ids and edge ids becomes a real bug source. Do not brand everything.

## Deriving the LLM response schema

The provider needs a JSON schema for structured output. Two ways:

1. Hand-write it next to `decide.ts` (clear, but can drift from Zod).
2. Derive it: `z.toJSONSchema(DecisionResultSchema)`.

If you derive it, verify against the provider before relying on it:

- OpenAI-style strict mode needs every property in `required` and `additionalProperties: false`. Use `z.strictObject` and no `.optional()` or `.default()` inside schemas that are sent as response formats.
- Remove the `$schema` key if the provider rejects it.
- Add a test that snapshots the generated schema so an accidental change is visible.

Keep the stored-record schemas (with defaults) separate from the response-format schema (no defaults).

## Persisted state and versioning

- Key: `yesno-flow:workflow:v1`. Bump the suffix on a breaking shape change and add a `migrate` function.
- Additive changes (a new field) use `.default()` or `.optional()` so old data still parses. A pre-Phase-5 workflow must parse unchanged.
- On rehydrate, `safeParse` the stored value. If it fails, log a safe message and fall back to the seed workflow.

## Performance

- Define schemas at module level, never inside components or request handlers.
- `.validate()` (4.6) returns a boolean without building an error object. Use it only where you need a yes or no on a hot path. Use `safeParse` when you need data or issues.
- Do not parse the same data twice. Parse at the boundary, pass the typed value inward.
- `zod/mini` is for bundle-critical client code. Not needed here.

## Testing schemas (Vitest)

```ts
import { describe, it, expect } from "vitest"

describe("NodeContextSchema", () => {
  it("rejects duplicate source ids with a path", () => {
    const r = NodeContextSchema.safeParse({
      sources: [
        { id: "wallet", format: "json", ref: "a.json" },
        { id: "wallet", format: "txt", ref: "b.txt" },
      ],
    })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].path).toEqual(["sources", 1, "id"])
  })

  it("accepts a pre-Phase-5 node with no context", () => {
    expect(DecisionNodeSchema.safeParse(legacyNode).success).toBe(true)
  })
})
```

- Test with `safeParse` and assert on `issues` (code, path), not on message text.
- Cover boundaries: min and max lengths, empty string, missing field, wrong type, unknown key (strict vs strip).
- Keep fixtures under `tests/fixtures/` and reuse them in schema, loader, and API tests.
- Always include one test that an older persisted or imported shape still parses.

## Anti-patterns

| Do not | Do |
| --- | --- |
| `z.string().email()`, `z.string().url()` | `z.email()`, `z.url()` |
| `z.coerce.boolean()` for flags | `z.stringbool()` |
| `z.record(z.string())` | `z.record(z.string(), z.unknown())` |
| `error.format()` | `z.flattenError()`, `z.treeifyError()`, `z.prettifyError()` |
| `required_error`, `invalid_type_error` | `error` option |
| Hand-written type beside a schema | `z.infer<typeof Schema>` |
| `any` after `JSON.parse` | `unknown`, then `safeParse` |
| Throwing in `.refine()` or `.transform()` | `ctx.addIssue()` with a `path` |
| `.default({})` on an object with inner defaults | `.prefault({})` |
| Creating schemas inside React components | Module-level constants |
| Retrying an Inngest step on invalid payload | `NonRetriableError` |
| Logging parsed user input from a failed parse | Log issue codes and paths only |

## Checklist

- [ ] zod is `^4.6.0` in `package.json`
- [ ] Schema is in `src/lib/schemas` (or `env.ts`), type is inferred
- [ ] Every boundary above uses `safeParse` with the right failure behavior
- [ ] Unknown-keys policy chosen on purpose
- [ ] Old persisted and imported data still parses
- [ ] Error output uses `z.flattenError` or `z.prettifyError`, never raw input
- [ ] Tests assert on issue code and path