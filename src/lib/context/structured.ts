import { promises as fs } from "node:fs"
import YAML from "yaml"
import { ContextError } from "../errors"
import { LoadedContextSchema, type ContextSource } from "../schemas/context"
import { resolveContextFile } from "./resolve-ref"

function flatten(value: unknown, prefix = "", depth = 0): string[] {
  if (depth > 6) return [`${prefix}: [max depth]`]
  if (value === null || typeof value !== "object") return [`${prefix}: ${typeof value === "string" && value.includes("\n") ? JSON.stringify(value) : String(value)}`]
  if (Array.isArray(value)) return [...value.slice(0, 50).flatMap((item, i) => flatten(item, `${prefix}[${i}]`, depth + 1)), ...(value.length > 50 ? [`${prefix}: [+${value.length - 50} more items]`] : [])]
  return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => flatten(item, prefix ? `${prefix}.${key}` : key, depth + 1))
}
export function flattenStructured(value: unknown): string { return flatten(value).join("\n") }
export async function loadStructured(source: ContextSource, opts: { root?: string; maxFileBytes?: number; maxSourceChars?: number } = {}) {
  const filename = await resolveContextFile(source.ref, source.format, opts)
  const bytes = await fs.readFile(filename)
  if (bytes.includes(0)) throw new ContextError(`Context file "${source.ref}" contains a NUL byte.`)
  let value: unknown
  try { value = source.format === "json" ? JSON.parse(bytes.toString("utf8")) as unknown : YAML.parse(bytes.toString("utf8")) as unknown }
  catch { throw new ContextError(`Context file "${source.ref}" is not valid ${source.format.toUpperCase()}.`) }
  const content = flattenStructured(value)
  return LoadedContextSchema.parse({ sourceId: source.id, format: source.format, title: source.label || pathName(source.ref), content, truncated: false })
}
const pathName = (ref: string) => ref.split("/").pop() ?? ref
