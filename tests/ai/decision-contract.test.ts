import { describe, expect, it } from "vitest"
import { DECISION_JSON_SCHEMA } from "../../src/lib/ai/decision-schema"
import { extractDecision } from "../../src/lib/ai/extract-decision"
import { DECISION_SYSTEM_PROMPT } from "../../src/lib/ai/prompt"
import { DecisionResultSchema } from "../../src/lib/schemas/context"

// Keywords outside the strict-mode subset that providers may reject with a 400.
const UNSUPPORTED = [
  "minLength", "maxLength", "pattern", "format", "minProperties", "maxProperties",
  "uniqueItems", "contains", "minContains", "maxContains", "patternProperties",
]

function objectNodes(node: unknown, out: Record<string, unknown>[] = []) {
  if (Array.isArray(node)) node.forEach((item) => objectNodes(item, out))
  else if (node && typeof node === "object") {
    out.push(node as Record<string, unknown>)
    Object.values(node).forEach((value) => objectNodes(value, out))
  }
  return out
}

describe("wire schema (response_format)", () => {
  const nodes = objectNodes(DECISION_JSON_SCHEMA)

  it("uses no keyword outside the strict-mode subset", () => {
    for (const node of nodes) for (const key of UNSUPPORTED) expect(node).not.toHaveProperty(key)
  })

  it("is strict: every object lists all properties as required and forbids extras", () => {
    const objects = nodes.filter((node) => node.type === "object")
    expect(objects.length).toBeGreaterThan(0)
    for (const node of objects) {
      expect(node.additionalProperties).toBe(false)
      expect([...(node.required as string[])].sort()).toEqual(Object.keys(node.properties as object).sort())
    }
  })

  it("allows exactly YES and NO, matching the Zod schema", () => {
    const enumValues = (DECISION_JSON_SCHEMA.properties.answer.enum as readonly string[]).slice()
    expect(enumValues).toEqual(["YES", "NO"])
    for (const answer of enumValues) expect(DecisionResultSchema.safeParse({ answer, citations: [] }).success).toBe(true)
    expect(DecisionResultSchema.safeParse({ answer: "MAYBE", citations: [] }).success).toBe(false)
  })
})

describe("system prompt output format", () => {
  it("states the exact-string rule", () => {
    expect(DECISION_SYSTEM_PROMPT).toContain('"answer" is the string "YES" or the string "NO"')
    expect(DECISION_SYSTEM_PROMPT).toContain("Never write both words")
  })

  it("does not contain the ambiguous inline template", () => {
    expect(DECISION_SYSTEM_PROMPT).not.toMatch(/"answer":\s*"YES"\s+or\s+"NO"/i)
  })

  it("shows one YES and one NO example, and both parse", () => {
    const examples = DECISION_SYSTEM_PROMPT.split("\n").filter((line) => line.startsWith('{"answer"'))
    expect(examples).toHaveLength(2)
    expect(examples.map((line) => extractDecision(line).answer).sort()).toEqual(["NO", "YES"])
  })
})
