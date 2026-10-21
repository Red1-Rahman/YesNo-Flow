import { LoadedContextSchema, type LoadedContext } from "../schemas/context"
export function applyBudgets(loaded: LoadedContext[], limits: { maxSourceChars: number; maxTotalChars: number }) {
  const warnings: string[] = []
  let remaining = limits.maxTotalChars
  const result = loaded.map((source) => {
    const allowed = Math.max(0, Math.min(limits.maxSourceChars, remaining))
    const truncated = source.content.length > allowed
    const content = truncated ? `${source.content.slice(0, Math.max(0, allowed - 12))}\n[truncated]` : source.content
    remaining = Math.max(0, remaining - content.length)
    if (truncated) warnings.push(`Context source "${source.sourceId}" was truncated.`)
    return LoadedContextSchema.parse({ ...source, content, truncated: source.truncated || truncated })
  })
  return { loaded: result, warnings }
}
