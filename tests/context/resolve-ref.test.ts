import { describe, expect, it } from "vitest"
import path from "node:path"
import { promises as fs } from "node:fs"
import os from "node:os"
import { resolveContextFile } from "../../src/lib/context/resolve-ref"

const root = path.resolve("tests/fixtures/context")
describe("resolveContextFile", () => {
  it.each(["../wallet.json", "..\\wallet.json", "C:/wallet.json", "a:b.json", "\\\\server\\share", "/etc/passwd", "CON.txt", "foo./x.json"])("rejects unsafe ref %s", async (ref) => {
    await expect(resolveContextFile(ref, "json", { root })).rejects.toThrow()
  })
  it("resolves an allowed file and checks extension", async () => {
    expect(await resolveContextFile("wallet.json", "json", { root })).toContain("wallet.json")
    await expect(resolveContextFile("wallet.json", "yaml", { root })).rejects.toThrow()
  })
  it("rejects oversized files", async () => {
    await expect(resolveContextFile("wallet.json", "json", { root, maxFileBytes: 1 })).rejects.toThrow(/size limit/)
  })
  it("rejects symlinks that escape the context root", async (ctx) => {
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), "yesno-context-"))
    try {
      try { await fs.symlink(path.join(root, "wallet.json"), path.join(temp, "outside.json")) }
      catch { ctx.skip(); return }
      await expect(resolveContextFile("outside.json", "json", { root: temp })).rejects.toThrow(/outside/)
    } finally {
      await fs.rm(temp, { recursive: true, force: true })
    }
  })
})
