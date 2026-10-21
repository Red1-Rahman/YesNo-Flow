import { DecisionResultSchema } from "../schemas/context"
import { AppError } from "../errors"
export function extractDecision(raw: string) {
  const clean = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim()
  let parsed: unknown
  const start = clean.indexOf("{")
  if (start < 0) {
    const bare = /^(YES|NO)[.!]?$/i.exec(clean)
    if (bare) parsed = { answer: bare[1].toUpperCase(), citations: [] }
    else throw new AppError("The model returned an answer that is not YES or NO. The step will be retried.")
  } else {
    let depth = 0, quote = false, escaped = false, end = -1
    for (let i = start; i < clean.length; i++) {
      const ch = clean[i]
      if (quote) { if (escaped) escaped = false; else if (ch === "\\") escaped = true; else if (ch === '"') quote = false; continue }
      if (ch === '"') quote = true
      else if (ch === "{") depth++
      else if (ch === "}" && --depth === 0) { end = i + 1; break }
    }
    if (end < 0) throw new AppError("The model returned an answer that is not YES or NO. The step will be retried.")
    try { parsed = JSON.parse(clean.slice(start, end)) as unknown } catch { throw new AppError("The model returned an answer that is not YES or NO. The step will be retried.") }
  }
  if (parsed && typeof parsed === "object" && "answer" in parsed && typeof parsed.answer === "string") parsed.answer = parsed.answer.toUpperCase()
  const result = DecisionResultSchema.safeParse(parsed)
  if (!result.success) throw new AppError("The model returned an answer that is not YES or NO. The step will be retried.", { cause: result.error })
  return result.data
}
