import { z } from "zod"

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_BASE_URL: z.string().url().default("https://openrouter.ai/api/v1"),
  OPENAI_MODEL: z.string().default("openrouter/free"),
  INNGEST_DEV: z.string().default("1"),
  INNGEST_BASE_URL: z.string().default("http://localhost:8288"),
  INNGEST_EVENT_KEY: z.string().default(""),
  INNGEST_SIGNING_KEY: z.string().default(""),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  WORKFLOW_MAX_STEPS: z.coerce.number().int().positive().default(25),
})

export type Env = z.infer<typeof envSchema>

export const env: Env = envSchema.parse(process.env)