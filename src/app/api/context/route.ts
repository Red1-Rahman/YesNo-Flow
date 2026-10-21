import { promises as fs } from "node:fs"
import path from "node:path"
import YAML from "yaml"
import { z } from "zod"
import { env } from "@/lib/env"
import { ContextFormatSchema } from "@/lib/schemas/context"
import { DbRegistrySchema } from "@/lib/context/sql"
import { VectorRegistrySchema } from "@/lib/context/vector"

const uploadEnabled = () => process.env.NODE_ENV !== "production" || env.CONTEXT_UPLOADS_ENABLED === "1"
const root = () => path.resolve(env.CONTEXT_DIR)
const extFormat = (name: string) => ({ ".md": "md", ".txt": "txt", ".json": "json", ".yaml": "yaml", ".yml": "yaml" } as Record<string, string>)[path.extname(name).toLowerCase()]

export async function GET() {
  const refs: { ref: string; format: string }[] = []
  const visit = async (dir: string) => {
    let entries
    try { entries = await fs.readdir(dir, { withFileTypes: true }) } catch { return }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue
      const abs = path.join(dir, entry.name)
      if (entry.isDirectory()) await visit(abs)
      else { const ref = path.relative(root(), abs).split(path.sep).join("/"); const format = extFormat(entry.name); if (format && !ref.startsWith("registry/")) refs.push({ ref, format }) }
    }
  }
  await visit(root())
  try { const data = DbRegistrySchema.parse(JSON.parse(await fs.readFile(path.join(root(), "registry", "db.json"), "utf8")) as unknown); for (const name of Object.keys(data.queries)) refs.push({ ref: name, format: "db" }) } catch { /* An absent registry simply exposes no registered sources. */ }
  try { const data = VectorRegistrySchema.parse(JSON.parse(await fs.readFile(path.join(root(), "registry", "vector.json"), "utf8")) as unknown); for (const name of Object.keys(data.collections)) refs.push({ ref: name, format: "vector-db" }) } catch { /* An absent registry simply exposes no registered sources. */ }
  return Response.json({ refs })
}

export async function POST(request: Request) {
  if (!uploadEnabled()) return Response.json({ error: "Context uploads are disabled." }, { status: 403 })
  let form: FormData
  try { form = await request.formData() } catch { return Response.json({ error: "Expected a multipart upload." }, { status: 400 }) }
  const body = z.object({ file: z.custom<File>((value) => value instanceof File) }).safeParse(Object.fromEntries(form.entries()))
  if (!body.success) return Response.json({ error: "Choose a context file to upload." }, { status: 400 })
  const file = body.data.file
  if (file.size > env.CONTEXT_MAX_FILE_BYTES) return Response.json({ error: "Context file exceeds the configured size limit." }, { status: 413 })
  let name = file.name.replace(/[^A-Za-z0-9._-]/g, "_").replace(/^\.+/, "")
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(name)) name = `_${name}`
  const formatValue = extFormat(name)
  const parsedFormat = ContextFormatSchema.safeParse(formatValue)
  if (!name || !parsedFormat.success) return Response.json({ error: "Unsupported context file type." }, { status: 400 })
  const bytes = Buffer.from(await file.arrayBuffer())
  if (bytes.includes(0)) return Response.json({ error: "Context file contains a NUL byte." }, { status: 400 })
  if (parsedFormat.data === "json" || parsedFormat.data === "yaml") {
    try { const parsedValue: unknown = parsedFormat.data === "json" ? JSON.parse(bytes.toString("utf8")) as unknown : YAML.parse(bytes.toString("utf8")) as unknown; void parsedValue }
    catch { return Response.json({ error: `Invalid ${parsedFormat.data.toUpperCase()} context.` }, { status: 400 }) }
  }
  const dir = path.join(root(), "uploads")
  await fs.mkdir(dir, { recursive: true })
  const parsedName = path.parse(name)
  let target = path.join(dir, name), suffix = 1
  while (true) {
    try { await fs.access(target); target = path.join(dir, `${parsedName.name}-${suffix++}${parsedName.ext}`) }
    catch { break }
  }
  await fs.writeFile(target, bytes, { flag: "wx" })
  return Response.json({ ref: `uploads/${path.basename(target)}`, format: parsedFormat.data, bytes: bytes.length })
}

export async function DELETE(request: Request) {
  if (!uploadEnabled()) return Response.json({ error: "Context uploads are disabled." }, { status: 403 })
  const query = z.object({ ref: z.string().regex(/^uploads\/[A-Za-z0-9._-]+$/) }).safeParse(Object.fromEntries(new URL(request.url).searchParams))
  if (!query.success) return Response.json({ error: "Only uploaded context files can be deleted." }, { status: 400 })
  try { await fs.unlink(path.join(root(), query.data.ref)); return Response.json({ ok: true }) }
  catch { return Response.json({ error: "Uploaded context file was not found." }, { status: 404 }) }
}
