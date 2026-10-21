import { promises as fs } from "node:fs"
import path from "node:path"
import { env } from "../env"
import { ContextError } from "../errors"
import type { ContextFormat } from "../schemas/context"

const extensions: Partial<Record<ContextFormat, string[]>> = { md: [".md"], txt: [".txt"], json: [".json"], yaml: [".yaml", ".yml"] }
const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i
export async function resolveContextFile(ref: string, format: ContextFormat, opts: { root?: string; maxFileBytes?: number } = {}): Promise<string> {
  if (!/^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/.test(ref)) throw new ContextError("Context reference is invalid.")
  const segments = ref.split("/")
  if (segments.some((part) => part === "." || part === ".." || /[. ]$/.test(part) || reserved.test(part))) throw new ContextError("Context reference is invalid.")
  if (!(extensions[format] ?? []).includes(path.extname(ref).toLowerCase())) throw new ContextError("Context file extension does not match its format.")
  const root = path.resolve(opts.root ?? env.CONTEXT_DIR)
  const target = path.resolve(root, ...segments)
  const [realRoot, realTarget] = await Promise.all([fs.realpath(root), fs.realpath(target)]).catch(() => { throw new ContextError(`Context file "${ref}" was not found.`) })
  let relative = path.relative(realRoot, realTarget)
  if (process.platform === "win32") relative = relative.toLowerCase()
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new ContextError("Context reference resolves outside the context directory.")
  const info = await fs.stat(realTarget)
  if (!info.isFile()) throw new ContextError("Context reference is not a file.")
  if (info.size > (opts.maxFileBytes ?? env.CONTEXT_MAX_FILE_BYTES)) throw new ContextError("Context file exceeds the configured size limit.")
  return realTarget
}
