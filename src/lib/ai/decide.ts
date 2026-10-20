import { DECISION_SYSTEM_PROMPT } from "./prompt"
import { z } from "zod"
import { OpenAI } from "openai"

const Model = process.env.OPENAI_MODEL || "gpt-4o-mini"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const AnswerSchema = z.object({
  answer: z.enum(["YES", "NO"]),
})

const systemPrompt = DECISION_SYSTEM_PROMPT

export async function decide({
  prompt,
  input,
}: {
  prompt: string
  input: string
}) {
  const completion = await openai.chat.completions.create({
    model: Model,
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
        schema: AnswerSchema.shape,
        strict: true,
      },
    },
  })

  const raw = completion.choices[0].message.content

  if (!raw) {
    throw new Error("No response from model")
  }

  const parsed = AnswerSchema.parse(JSON.parse(raw))
  return parsed.answer
}