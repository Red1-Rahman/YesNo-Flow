import { OpenAI } from "openai"
import { z } from "zod"
import { env } from "../env"
import { AnswerSchema } from "../schemas/workflow"
import { DECISION_SYSTEM_PROMPT } from "./prompt"

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  baseURL: env.OPENAI_BASE_URL,
})

const DecisionResponseSchema = z.object({ answer: AnswerSchema }).strict()

const decisionJsonSchema = {
  type: "object",
  properties: { answer: { type: "string", enum: ["YES", "NO"] } },
  required: ["answer"],
  additionalProperties: false,
} as const

const systemPrompt = DECISION_SYSTEM_PROMPT

export async function decide({
  prompt,
  input,
}: {
  prompt: string
  input: string
}) {
  const completion = await openai.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature: 0,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Input: "${input}"\n\nQuestion: ${prompt}\n\nAnswer ONLY with YES or NO.`,
      },
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

  const raw = completion.choices[0].message.content

  if (!raw) {
    throw new Error("No response from model")
  }

  const parsed: unknown = JSON.parse(raw)
  return DecisionResponseSchema.parse(parsed).answer
}
