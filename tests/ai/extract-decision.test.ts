import { describe, expect, it } from "vitest"
import { extractDecision } from "../../src/lib/ai/extract-decision"

const ok = (raw: string) => extractDecision(raw)
const NOT_YES_OR_NO = /not YES or NO/
const ECHO = /repeated the answer template/
const CONFLICT = /conflicting answers/

describe("extractDecision: accepted shapes", () => {
  it("parses a plain object with citations", () => {
    const r = ok('{"answer":"NO","citations":[{"sourceId":"wallet","quote":"balance: 80"}]}')
    expect(r).toEqual({ answer: "NO", citations: [{ sourceId: "wallet", quote: "balance: 80" }] })
  })

  it("strips markdown fences and surrounding prose", () => {
    expect(ok('Here you go:\n```json\n{"answer":"YES","citations":[]}\n```\nDone.').answer).toBe("YES")
  })

  it("normalizes case, quotes, and trailing punctuation", () => {
    expect(ok('{"answer":"yes","citations":[]}').answer).toBe("YES")
    expect(ok('{"answer":"No.","citations":[]}').answer).toBe("NO")
    expect(ok('{"answer":"**YES**","citations":[]}').answer).toBe("YES")
  })

  it("defaults missing citations to an empty array", () => {
    expect(ok('{"answer":"YES"}')).toEqual({ answer: "YES", citations: [] })
  })

  it("accepts a bare answer, quoted or punctuated", () => {
    expect(ok("YES")).toEqual({ answer: "YES", citations: [] })
    expect(ok('"No."')).toEqual({ answer: "NO", citations: [] })
  })

  it("is string aware when a quote contains braces", () => {
    const r = ok('{"answer":"YES","citations":[{"sourceId":"a","quote":"set {x} to 1"}]}')
    expect(r.citations[0].quote).toBe("set {x} to 1")
  })

  it("accepts the same answer repeated", () => {
    expect(ok('{"answer":"YES","citations":[]} {"answer":"YES","citations":[]}').answer).toBe("YES")
  })
})

describe("extractDecision: reasoning blocks", () => {
  it("ignores JSON inside a closed think block", () => {
    expect(ok('<think>maybe {"answer":"NO","citations":[]}</think>{"answer":"YES","citations":[]}').answer).toBe("YES")
  })

  it("ignores reasoning before an orphan closing tag", () => {
    expect(ok('weighing {"answer":"NO","citations":[]} </think>{"answer":"YES","citations":[]}').answer).toBe("YES")
  })

  it("does not read a decoy from a think block that never closed", () => {
    expect(() => ok('<think>maybe {"answer":"NO","citations":[]}')).toThrow(NOT_YES_OR_NO)
  })

  it("handles the <thinking> spelling", () => {
    expect(ok('<thinking>{"answer":"NO"}</thinking>{"answer":"YES"}').answer).toBe("YES")
  })
})

describe("extractDecision: template echoes are errors, never guesses", () => {
  it.each([
    '{"answer":"YES or NO","citations":[]}',
    '{"answer":"YES|NO","citations":[]}',
    '{"answer":"YES/NO","citations":[]}',
    '{"answer":"yes, no","citations":[]}',
    '{"answer": "YES" or "NO", "citations": []}',
    "YES or NO",
    "YES/NO.",
  ])("rejects %s", (raw) => {
    expect(() => ok(raw)).toThrow(ECHO)
  })

  it("skips an echo and accepts a real answer that follows it", () => {
    expect(ok('{"answer":"YES or NO","citations":[]} {"answer":"NO","citations":[]}').answer).toBe("NO")
  })
})

describe("extractDecision: conflicts and junk", () => {
  it("rejects conflicting answers instead of taking the first", () => {
    expect(() => ok('{"answer":"NO","citations":[]} then {"answer":"YES","citations":[]}')).toThrow(CONFLICT)
  })

  it.each([
    "MAYBE",
    "Yes, it is.",
    "I think the answer is YES because the balance is high",
    '{"answer":"MAYBE","citations":[]}',
    '{"answer":true,"citations":[]}',
    '{"answer":"YES","citations":"wallet"}',
    '{"answer":"YES","citations":[]',
    "{}",
    "",
  ])("rejects %j", (raw) => {
    expect(() => ok(raw)).toThrow(NOT_YES_OR_NO)
  })
})
