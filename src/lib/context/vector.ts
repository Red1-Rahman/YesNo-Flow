import { promises as fs } from "node:fs"
import path from "node:path"
import { z } from "zod"
import { env } from "../env"
import { ContextError } from "../errors"
import type { ContextSource } from "../schemas/context"
import { LoadedContextSchema } from "../schemas/context"
export type Match = { id: string; text: string; score: number }
export interface EmbeddingStore { search(collection: string, query: string, topK: number): Promise<Match[]> }
export const VectorRegistrySchema = z.object({ collections: z.record(z.string(), z.object({ dir: z.string() })) })
const words = (value: string) => new Set(value.toLowerCase().match(/[a-z0-9]+/g) ?? [])
export class InMemoryKeywordStore implements EmbeddingStore {
  constructor(private readonly collections: Record<string, string[]> = {}) {}
  async search(collection: string, query: string, topK: number) {
    const queryWords = words(query)
    return (this.collections[collection] ?? []).map((text, index) => { const tokens = words(text); const overlap = [...queryWords].filter((word) => tokens.has(word)).length; return { id: String(index + 1), text, score: queryWords.size ? overlap / queryWords.size : 0 } }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || Number(a.id) - Number(b.id)).slice(0, topK)
  }
}
async function chunks(dir: string) {
  const results: string[] = []
  const visit = async (target: string) => {
    for (const item of await fs.readdir(target, { withFileTypes: true })) {
      const full = path.join(target, item.name)
      if (item.isSymbolicLink()) continue
      if (item.isDirectory()) await visit(full)
      else { const text = await fs.readFile(full, "utf8"); for (const para of text.split(/\n\s*\n/)) for (let i = 0; i < para.length; i += 800) if (para.slice(i, i + 800).trim()) results.push(para.slice(i, i + 800).trim()) }
    }
  }
  await visit(dir); return results
}
export async function loadVectorSource(source: ContextSource, prompt: string, input: string, store?: EmbeddingStore) {
  const file = path.join(path.resolve(env.CONTEXT_DIR), "registry", "vector.json")
  let registry: z.infer<typeof VectorRegistrySchema>
  try { registry = VectorRegistrySchema.parse(JSON.parse(await fs.readFile(file, "utf8")) as unknown) } catch { throw new ContextError("Vector context registry is unavailable or invalid.") }
  const collection = registry.collections[source.ref]
  if (!collection) throw new ContextError(`Vector collection "${source.ref}" is not registered.`)
  if (!/^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/.test(collection.dir) || collection.dir.split("/").some((part) => part === "." || part === "..")) throw new ContextError("Vector collection directory is invalid.")
  const root = await fs.realpath(path.resolve(env.CONTEXT_DIR))
  const dir = await fs.realpath(path.resolve(root, ...collection.dir.split("/"))).catch(() => { throw new ContextError(`Vector collection "${source.ref}" is unavailable.`) })
  const relative = path.relative(root, dir)
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new ContextError("Vector collection directory resolves outside the context directory.")
  const defaultStore = store ?? new InMemoryKeywordStore({ [source.ref]: await chunks(dir) })
  const matches = await defaultStore.search(source.ref, `${prompt}\n${input.slice(0, 500)}`, source.topK ?? 5)
  const content = matches.map((item, index) => `[chunk ${index + 1}, score ${item.score.toFixed(2)}] ${item.text}`).join("\n")
  return LoadedContextSchema.parse({ sourceId: source.id, format: "vector-db", title: source.label || source.ref, content, truncated: false })
}
