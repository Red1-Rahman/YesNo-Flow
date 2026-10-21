import { describe, expect, it } from "vitest"
import path from "node:path"
import { promises as fs } from "node:fs"
import os from "node:os"
import { flattenStructured, loadStructured } from "../../src/lib/context/structured"

const root = path.resolve("tests/fixtures/context")
describe("structured context", () => {
  it("flattens JSON and YAML into stable key paths", async () => {
    const json = await loadStructured({ id: "wallet", format: "json", ref: "wallet.json", required: true }, { root })
    const yaml = await loadStructured({ id: "wallet", format: "yaml", ref: "wallet.yaml", required: true }, { root })
    expect(json.content).toContain("currency: BDT\nbalance: 80")
    expect(yaml.content).toContain("updatedAt: 2026-10-21")
  })
  it("turns parse failures into safe context errors", async () => {
    await expect(loadStructured({ id: "broken", format: "json", ref: "bad.json", required: true }, { root })).rejects.toThrow(/not valid JSON/)
  })
  it("preserves key order, null values, and array caps", () => {
    const text = flattenStructured({ first: null, rows: Array.from({ length: 51 }, (_, index) => index) })
    expect(text.startsWith("first: null\nrows[0]: 0")).toBe(true)
    expect(text).toContain("rows: [+1 more items]")
  })
  it("rejects a file containing NUL bytes", async () => {
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), "yesno-nul-"))
    try {
      await fs.writeFile(path.join(temp, "bad.json"), Buffer.from([123, 0, 125]))
      await expect(loadStructured({ id: "nul", format: "json", ref: "bad.json", required: true }, { root: temp })).rejects.toThrow(/NUL/)
    } finally { await fs.rm(temp, { recursive: true, force: true }) }
  })
})
