import { z } from "zod"
import { promises as fs } from "node:fs"
import path from "node:path"
import { env } from "../env"
import { ContextError } from "../errors"
import type { ContextSource } from "../schemas/context"
import { LoadedContextSchema } from "../schemas/context"
import { flattenStructured } from "./structured"

export type Row = Record<string, unknown>
export interface DbClient { query(sql: string, params: readonly unknown[]): Promise<Row[]> }
export const DbRegistrySchema = z.object({ queries: z.record(z.string(), z.object({ sql: z.string(), params: z.array(z.unknown()) })) })
export function assertReadOnlySql(sql: string): string {
  const trimmed = sql.trim()
  const statement = trimmed.replace(/;\s*$/, "")
  if (!/^(SELECT|WITH)\b/i.test(statement) || /;/.test(statement) || /\b(INSERT|UPDATE|DELETE|MERGE|DROP|ALTER|CREATE|TRUNCATE|CALL|EXEC)\b/i.test(statement)) throw new ContextError("Registered database query must contain one read-only SELECT or WITH statement.")
  return statement
}
export class InMemoryDbClient implements DbClient {
  constructor(private readonly rows: Row[] = [{ balance: 80, currency: "BDT" }]) {}
  async query(sql: string, params: readonly unknown[]) { assertReadOnlySql(sql); void params; return this.rows }
}
export async function loadDbSource(source: ContextSource, client: DbClient = new InMemoryDbClient()) {
  const file = path.join(path.resolve(env.CONTEXT_DIR), "registry", "db.json")
  let registry: z.infer<typeof DbRegistrySchema>
  try { registry = DbRegistrySchema.parse(JSON.parse(await fs.readFile(file, "utf8")) as unknown) } catch { throw new ContextError("Database context registry is unavailable or invalid.") }
  const entry = registry.queries[source.ref]
  if (!entry) throw new ContextError(`Database query "${source.ref}" is not registered.`)
  const rows = await client.query(assertReadOnlySql(entry.sql), entry.params)
  return LoadedContextSchema.parse({ sourceId: source.id, format: "db", title: source.label || source.ref, content: flattenStructured(rows), truncated: false })
}
