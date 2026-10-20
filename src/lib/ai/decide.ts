import { OpenAI } from "openai"
import { z } from "zod"
import { env } from "../env"
import { AppError } from "../errors"
import { AnswerSchema } from "../schemas/workflow"
import { DECISION_SYSTEM_PROMPT, buildUserMessage } from "./prompt"

const DecisionResponseSchema = z.object({ answer: AnswerSchema }).strict()

const decisionJsonSchema = {
  type: "object",
  properties: { answer: { type: "string", enum: ["YES", "NO"] } },
  required: ["answer"],
  additionalProperties: false,
} as const

let client: OpenAI | undefined

function getClient(): OpenAI {
  if (!env.OPENAI_API_KEY) {
    throw new AppError(
      "OPENAI_API_KEY is not configured on the server. Add it to .env.local and restart the app.",
    )
  }
  client ??= new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    baseURL: env.OPENAI_BASE_URL,
  })
  return client
}

// Log the error kind only. Provider messages can echo parts of the API key,
// so they must never reach logs or users.
function describeProviderError(error: unknown): string {
  if (!(error instanceof Error)) return "unknown error"
  const status = (error as { status?: unknown }).status
  return typeof status === "number"
    ? `${error.name} (status ${status})`
    : error.name
}

export async function decide({
  prompt,
  input,
}: {
  prompt: string
  input: string
}): Promise<"YES" | "NO"> {
  const openai = getClient()

  let raw: string | null
  try {
    const completion = await openai.chat.completions.create({
      model: env.OPENAI_MODEL,
      temperature: 0,
      messages: [
        { role: "system", content: DECISION_SYSTEM_PROMPT },
        { role: "user", content: buildUserMessage({ prompt, input }) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "Answer",
          schema: decisionJsonSchema,
          strict: true,
        },
      },
    })
    raw = completion.choices[0]?.message.content ?? null
  } catch (error) {
    console.error("[decide] provider call failed:", describeProviderError(error))
    throw new AppError(
      "The model request failed. Check the server configuration and try again.",
      { cause: error },
    )
  }

  if (!raw) {
    throw new AppError(
      "The model returned an empty response. The step will be retried.",
    )
  }

  // Some OpenAI-compatible endpoints (for example OpenRouter free models)
  // ignore response_format and answer in plain text. Strip markdown code
  // fences, then accept a bare YES or NO. Both paths still end in the same
  // Zod check, so anything that is not exactly YES or NO throws.
  const normalized = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(normalized)
  } catch {
    const bare = AnswerSchema.safeParse(normalized.toUpperCase())
    if (bare.success) {
      return bare.data
    }
    throw new AppError(
      "The model returned an answer that is not YES or NO. The step will be retried.",
    )
  }

  const result = DecisionResponseSchema.safeParse(parsed)
  if (!result.success) {
    throw new AppError(
      "The model returned an answer that is not YES or NO. The step will be retried.",
      { cause: result.error },
    )
  }
  return result.data.answer
}
