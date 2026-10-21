import { loadContext } from "@/lib/context/load"
import { ContextSourceSchema } from "@/lib/schemas/context"
export async function POST(request: Request) {
  let body: unknown
  try { body = await request.json() } catch { return Response.json({ error: "Request body must be valid JSON." }, { status: 400 }) }
  const parsed = ContextSourceSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  try {
    const { loaded } = await loadContext([{ ...parsed.data, required: true }])
    const source = loaded[0]
    return Response.json({ title: source.title, content: source.content.slice(0, 2000), truncated: source.truncated || source.content.length > 2000 })
  } catch (error) { return Response.json({ title: parsed.data.label || parsed.data.ref, content: "", truncated: false, error: error instanceof Error ? error.message : "Context preview failed." }) }
}
