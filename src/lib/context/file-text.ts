import { promises as fs } from "node:fs"
import { ContextError } from "../errors"
import { LoadedContextSchema, type ContextSource } from "../schemas/context"
import { resolveContextFile } from "./resolve-ref"
export async function loadFileText(source: ContextSource, opts: { root?: string; maxFileBytes?: number; maxSourceChars?: number } = {}) {
  const filename = await resolveContextFile(source.ref, source.format, opts)
  const bytes = await fs.readFile(filename)
  if (bytes.includes(0)) throw new ContextError(`Context file "${source.ref}" contains a NUL byte.`)
  const content = bytes.toString("utf8")
  return LoadedContextSchema.parse({ sourceId: source.id, format: source.format, title: source.label || source.ref.split("/").pop(), content, truncated: false })
}
