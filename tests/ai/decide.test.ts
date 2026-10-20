import { describe, it, expect } from "vitest"
import { decide } from "../../src/lib/ai/decide"

describe("decide", () => {
  it("returns YES or NO", async () => {
    const result = await decide({
      prompt: "Do you agree?",
      input: "",
    })
    expect(["YES", "NO"]).toContain(result)
  })
})