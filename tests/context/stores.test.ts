import { describe, expect, it } from "vitest"
import { assertReadOnlySql, InMemoryDbClient } from "../../src/lib/context/sql"
import { InMemoryKeywordStore } from "../../src/lib/context/vector"

describe("context store adapters", () => {
  it("accepts a single read query and rejects writes and chained statements", async () => {
    expect(assertReadOnlySql(" SELECT balance FROM wallet; ")).toBe("SELECT balance FROM wallet")
    expect(() => assertReadOnlySql("DROP TABLE wallet")).toThrow()
    expect(() => assertReadOnlySql("SELECT 1; DELETE FROM wallet")).toThrow()
    expect(await new InMemoryDbClient([{ balance: 80 }]).query("SELECT balance FROM wallet", [])).toEqual([{ balance: 80 }])
  })
  it("scores deterministically and respects topK", async () => {
    const store = new InMemoryKeywordStore({ menu: ["chicken burger", "garden salad", "beef burger"] })
    expect(await store.search("menu", "burger", 1)).toEqual([{ id: "1", text: "chicken burger", score: 1 }])
  })
})
