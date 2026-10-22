import { OpenAI } from "openai"
import { RetryAfterError } from "inngest"
import { env } from "../env"
import { AppError } from "../errors"
import type { LoadedContext, ModelCitation } from "../schemas/context"
import { DECISION_SYSTEM_PROMPT, buildUserMessage } from "./prompt"
import { DECISION_JSON_SCHEMA } from "./decision-schema"
import { extractDecision } from "./extract-decision"
import { verifyCitations } from "./verify-citations"

let client: OpenAI | undefined
function getClient() {
  if (!env.OPENAI_API_KEY) throw new AppError("OPENAI_API_KEY is not configured on the server. Add it to .env.local and restart the app.")
  client ??= new OpenAI({ apiKey: env.OPENAI_API_KEY, baseURL: env.OPENAI_BASE_URL })
  return client
}
const statusOf = (error: unknown) => typeof error === "object" && error !== null && "status" in error && typeof error.status === "number" ? error.status : undefined
const retryAfterOf = (error: unknown) => typeof error === "object" && error !== null && "headers" in error ? (error.headers as Headers).get?.("retry-after") : null

export async function decide({ prompt, input, context = [], signal }: { prompt: string; input: string; context?: LoadedContext[]; signal?: AbortSignal }): Promise<{ answer: "YES" | "NO"; citations: ReturnType<typeof verifyCitations>["citations"]; grounded: boolean; model: string }> {
  const openai = getClient()
  const base = { model: env.OPENAI_MODEL, temperature: 0, max_tokens: 400, messages: [{ role: "system" as const, content: DECISION_SYSTEM_PROMPT }, { role: "user" as const, content: buildUserMessage({ prompt, input, context }) }] }
  const request = (withSchema: boolean) => openai.chat.completions.create({ ...base, ...(withSchema ? { response_format: { type: "json_schema" as const, json_schema: { name: "DecisionResult", schema: DECISION_JSON_SCHEMA, strict: true as const } } } : {}) }, { signal })
  let response
  try {
    if (env.LLM_STRUCTURED_OUTPUT === "off") response = await request(false)
    else {
      try { response = await request(true) }
      catch (error) {
        const status = statusOf(error)
        if (env.LLM_STRUCTURED_OUTPUT !== "auto" || !status || status < 400 || status >= 500 || [401, 403, 429].includes(status)) throw error
        // Metadata only. Without this, a provider that rejects the schema silently disables enforcement.
        console.warn(`[decide] structured output rejected (HTTP ${status}), retrying once without response_format`)
        response = await request(false)
      }
    }
  } catch (error) {
    const status = statusOf(error)
    console.error("[decide] provider call failed:", status ? `HTTP ${status}` : error instanceof Error ? error.name : "unknown error")
    if (status === 429) {
      const header = retryAfterOf(error)
      const retryAfter = header && Number.isFinite(Number(header))
        ? Math.max(1000, Number(header) * 1000)
        : header && !Number.isNaN(Date.parse(header))
          ? new Date(header)
          : header || 60_000
      throw new RetryAfterError("The model provider is rate limited.", retryAfter, { cause: error })
    }
    throw new AppError("The model request failed. Check the server configuration and try again.", { cause: error })
  }
  const choice = response.choices[0]
  const raw = choice?.message.content
  if (typeof raw !== "string" || raw.trim().length === 0) {
    // Keep this metadata-only. Provider responses can contain private prompts,
    // run input, or context, so never log the response body here.
    const diagnostic = {
      model: response.model || "unknown",
      finishReason: choice?.finish_reason ?? "unknown",
      completionTokens: response.usage?.completion_tokens ?? null,
      promptTokens: response.usage?.prompt_tokens ?? null,
    }
    console.error("[decide] provider returned no final answer:", diagnostic)
    throw new AppError(
      `The model returned no final answer (model: ${diagnostic.model}; finish reason: ${diagnostic.finishReason}). The step will be retried.`,
      { code: "EMPTY_MODEL_RESPONSE" },
    )
  }
  const result = extractDecision(raw)
  const verified = context.length ? verifyCitations(result.citations as ModelCitation[], context) : { citations: [], grounded: false }
  return { answer: result.answer, ...verified, model: response.model }
}