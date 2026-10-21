import { describe, expect, it } from "vitest"
import path from "node:path"
import { loadContext } from "../../src/lib/context/load"

const root = path.resolve("tests/fixtures/context")
describe("loadContext", () => {
  it("flattens structured context and preserves source order", async () => {
    const result = await loadContext([{ id: "wallet", format: "json", ref: "wallet.json", required: true }, { id: "notes", format: "md", ref: "notes.md", required: true }], { root })
    expect(result.loaded.map((item) => item.sourceId)).toEqual(["wallet", "notes"])
    expect(result.loaded[0].content).toContain("balance: 80")
  })
  it("fails closed for required sources and warns for optional ones", async () => {
    await expect(loadContext([{ id: "missing", format: "json", ref: "missing.json", required: true }], { root })).rejects.toThrow(/missing/)
    const result = await loadContext([{ id: "optional", format: "json", ref: "missing.json", required: false }], { root })
    expect(result.loaded).toHaveLength(0)
    expect(result.warnings[0]).toContain("optional")
  })
  it("applies per-source and total budgets", async () => {
    const result = await loadContext([{ id: "one", format: "md", ref: "notes.md", required: true }, { id: "two", format: "md", ref: "notes.md", required: true }], { root, maxSourceChars: 20, maxTotalChars: 32 })
    expect(result.loaded[0].content.length).toBeLessThanOrEqual(20)
    expect(result.loaded[1].truncated).toBe(true)
    expect(result.warnings).toContain('Context source "one" was truncated.')
  })
})
