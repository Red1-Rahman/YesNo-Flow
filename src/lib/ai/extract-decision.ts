import { AppError } from "../errors"
import { DecisionResultSchema } from "../schemas/context"

const NOT_YES_OR_NO = "The model returned an answer that is not YES or NO. The step will be retried."
const TEMPLATE_ECHO = "The model repeated the answer template instead of choosing YES or NO. The step will be retried."
const CONFLICT = "The model returned conflicting answers. The step will be retried."

// "YES or NO", "YES/NO", "YES|NO", "YES, NO": the format description copied back as the answer.
const ECHO_TEXT = /^(?:YES|NO)\s*(?:\/|\||,|\bOR\b)\s*(?:YES|NO)$/i
// The same echo inside an object that is not valid JSON, for example {"answer": "YES" or "NO"}.
const ECHO_IN_OBJECT = /"answer"\s*:\s*"?(?:YES|NO)"?\s*(?:\/|\||,|\bOR\b)\s*"?(?:YES|NO)\b/i

type DecisionResult = ReturnType<typeof DecisionResultSchema.parse>

/**
 * Accepts only the same token with cosmetic differences: case, surrounding quotes or markdown
 * emphasis, trailing punctuation. Anything else is not an answer. The model is never guessed at.
 */
function normalizeAnswer(value: unknown): "YES" | "NO" | "echo" | undefined {
  if (typeof value !== "string") return undefined
  const text = value
    .replace(/^[\s"'`*_]+|[\s"'`*_.!]+$/g, "")
    .replace(/\s+/g, " ")
    .toUpperCase()
  if (text === "YES" || text === "NO") return text
  return ECHO_TEXT.test(text) ? "echo" : undefined
}

function stripNoise(raw: string): string {
  return raw
    .replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, "") // closed reasoning blocks
    .replace(/^[\s\S]*<\/think(?:ing)?>/i, "") // closing tag whose opening tag the provider stripped
    .replace(/<think(?:ing)?>[\s\S]*$/i, "") // never closed: output was cut off, nothing after it is an answer
    .replace(/```(?:json)?/gi, "")
    .trim()
}

/** Every balanced top-level {...} in the text, string-aware, ignoring prose around them. */
function topLevelObjects(text: string): string[] {
  const found: string[] = []
  let depth = 0
  let start = -1
  let inString = false
  let escaped = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === "\\") escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"' && depth > 0) inString = true
    else if (ch === "{") {
      if (depth === 0) start = i
      depth++
    } else if (ch === "}" && depth > 0) {
      depth--
      if (depth === 0) found.push(text.slice(start, i + 1))
    }
  }
  return found
}

/**
 * Tolerant extraction, strict validation. Every accepted result has passed DecisionResultSchema.
 * Missing citations default to [] (the same as a bare YES or NO). Template echoes and conflicting
 * answers are errors, never a guess, so the step is retried.
 */
export function extractDecision(raw: string): DecisionResult {
  const text = stripNoise(raw)
  const objects = topLevelObjects(text)

  if (objects.length === 0) {
    const bare = normalizeAnswer(text)
    if (bare === "echo") throw new AppError(TEMPLATE_ECHO)
    if (bare) return DecisionResultSchema.parse({ answer: bare, citations: [] })
    throw new AppError(NOT_YES_OR_NO)
  }

  const valid: DecisionResult[] = []
  let sawEcho = false
  let lastError: unknown
  for (const object of objects) {
    let parsed: unknown
    try {
      parsed = JSON.parse(object)
    } catch (error) {
      if (ECHO_IN_OBJECT.test(object)) sawEcho = true
      else lastError = error
      continue
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) continue
    const record = parsed as Record<string, unknown>
    const answer = normalizeAnswer(record.answer)
    if (answer === "echo") {
      sawEcho = true
      continue
    }
    const result = DecisionResultSchema.safeParse({
      ...record,
      answer: answer ?? record.answer,
      citations: "citations" in record ? record.citations : [],
    })
    if (result.success) valid.push(result.data)
    else lastError = result.error
  }

  if (valid.length === 0) throw new AppError(sawEcho ? TEMPLATE_ECHO : NOT_YES_OR_NO, { cause: lastError })
  if (new Set(valid.map((result) => result.answer)).size > 1) throw new AppError(CONFLICT)
  return valid[0]
}